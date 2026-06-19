"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { formText, positiveInteger, validateUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  return formText(formData, key, 1000);
}

function getPositiveInteger(formData: FormData, key: string) {
  return positiveInteger(formData, key);
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function enforceRateLimit(path: string, key: string, limit: number, windowMs: number) {
  const result = checkRateLimit({ key, limit, windowMs });
  if (!result.allowed) {
    redirectWithError(path, rateLimitMessage());
  }
}

function logSupabaseError(label: string, error: unknown, context: Record<string, unknown>) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  console.error(label, {
    message: typeof record?.message === "string" ? record.message : String(error),
    code: record?.code ?? null,
    details: record?.details ?? null,
    hint: record?.hint ?? null,
    error,
    ...context
  });
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase, userId: user.id };
}

async function getListingParticipantData(supabase: Awaited<ReturnType<typeof createClient>>, listingId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id,seller_id,title")
    .eq("id", listingId)
    .single();

  if (error || !data) {
    if (error) {
      logSupabaseError("Load listing participant error:", error, {
        table: "listings",
        listingId
      });
    }
    throw new Error(error?.message ?? "No se encontró la publicación.");
  }

  return data;
}

async function createOfferNotification({
  supabase,
  offerId,
  listingId,
  receiverId,
  senderId,
  listingTitle
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  offerId: string;
  listingId: string;
  receiverId: string;
  senderId: string;
  listingTitle: string;
}) {
  const { data: senderProfile, error: senderError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", senderId)
    .maybeSingle();

  if (senderError) {
    logSupabaseError("Create offer notification error:", senderError, {
      table: "profiles",
      action: "loadSenderName",
      senderId,
      offerId
    });
  }

  const senderName =
    typeof senderProfile?.full_name === "string" && senderProfile.full_name.trim().length > 0
      ? senderProfile.full_name.trim()
      : "Alguien";

  const { error } = await supabase.from("notifications").insert({
    user_id: receiverId,
    type: "offer_received",
    title: "Nueva oferta recibida",
    body: `${senderName} te hizo una oferta por ${listingTitle}.`,
    related_listing_id: listingId,
    related_offer_id: offerId
  });

  if (error) {
    logSupabaseError("Create offer notification error:", error, {
      table: "notifications",
      action: "insert",
      offerId,
      listingId,
      receiverId,
      senderId
    });
  }
}

async function createUserNotification({
  supabase,
  userId,
  type,
  title,
  body,
  listingId,
  offerId,
  conversationId,
  messageId
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  type: string;
  title: string;
  body: string;
  listingId?: string | null;
  offerId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    related_listing_id: listingId ?? null,
    related_offer_id: offerId ?? null,
    related_conversation_id: conversationId ?? null,
    related_message_id: messageId ?? null
  });

  if (error) {
    logSupabaseError("Create offer notification error:", error, {
      table: "notifications",
      action: "insert",
      userId,
      type,
      listingId,
      offerId,
      conversationId,
      messageId
    });
  }
}

async function createDirectMessageNotification({
  supabase,
  recipientId,
  senderId,
  conversationId,
  messageId,
  listingId,
  listingTitle
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  recipientId: string;
  senderId: string;
  conversationId: string;
  messageId: string;
  listingId: string | null;
  listingTitle: string;
}) {
  const { data: senderProfile, error: senderError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", senderId)
    .maybeSingle();

  if (senderError) {
    logSupabaseError("Create message notification error:", senderError, {
      table: "profiles",
      action: "loadSenderName",
      senderId,
      conversationId,
      messageId
    });
  }

  const senderName =
    typeof senderProfile?.full_name === "string" && senderProfile.full_name.trim().length > 0
      ? senderProfile.full_name.trim()
      : "Alguien";

  await createUserNotification({
    supabase,
    userId: recipientId,
    type: "message_received",
    title: "Nuevo mensaje",
    body: `${senderName} te envió un mensaje sobre ${listingTitle}.`,
    listingId,
    conversationId,
    messageId
  });
}

export async function startConversation(formData: FormData) {
  const listingId = getString(formData, "listing_id");
  const initialMessage = formText(formData, "message", 1000);
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit(`/articulos/${listingId || ""}`, `message-start:${userId}`, 10, 60_000);

  try {
    validateUuid(listingId, "Publicación");
  } catch (error) {
    redirectWithError("/explorar", error instanceof Error ? error.message : "Publicación inválida.");
  }

  const listing = await getListingParticipantData(supabase, listingId).catch((error) => {
    redirectWithError(
      `/articulos/${listingId}`,
      error instanceof Error ? error.message : "No se encontró la publicación."
    );
  });

  if (listing.seller_id === userId) {
    redirectWithError(`/articulos/${listingId}`, "No puedes abrir un chat contigo mismo.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("direct_conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .eq("seller_id", listing.seller_id)
    .maybeSingle();

  if (existingError) {
    logSupabaseError("Create conversation error:", existingError, {
      table: "direct_conversations",
      action: "findExisting",
      listingId,
      buyerId: userId,
      sellerId: listing.seller_id
    });
    redirectWithError(`/articulos/${listingId}`, "No se pudo abrir la conversación. Inténtalo nuevamente.");
  }

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from("direct_conversations")
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id
      })
      .select("id")
      .single();

    if (createError || !created) {
      logSupabaseError("Create conversation error:", createError ?? new Error("conversation_insert_returned_no_data"), {
        table: "direct_conversations",
        action: "insert",
        listingId,
        buyerId: userId,
        sellerId: listing.seller_id
      });
      redirectWithError(
        `/articulos/${listingId}`,
        "No se pudo abrir la conversación. Inténtalo nuevamente."
      );
    }

    conversationId = created.id;
  }

  if (initialMessage) {
    const { data: createdMessage, error: messageError } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: initialMessage
      })
      .select("id")
      .single();

    if (messageError || !createdMessage) {
      logSupabaseError("Send message error:", messageError, {
        table: "direct_messages",
        conversationId,
        senderId: userId,
        listingId
      });
      redirectWithError(`/articulos/${listingId}`, "No se pudo enviar el mensaje. Inténtalo nuevamente.");
    }

    await createDirectMessageNotification({
      supabase,
      recipientId: listing.seller_id,
      senderId: userId,
      conversationId,
      messageId: createdMessage.id,
      listingId,
      listingTitle: listing.title
    });
  }

  revalidatePath("/mensajes");
  revalidatePath("/perfil");
  redirect(`/mensajes/${conversationId}`);
}

export async function sendDirectMessage(formData: FormData) {
  const conversationId = getString(formData, "conversation_id");
  const body = formText(formData, "body", 1000);
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit(`/mensajes/${conversationId || ""}`, `message-send:${userId}`, 30, 60_000);

  try {
    validateUuid(conversationId, "Conversación");
  } catch (error) {
    redirectWithError("/mensajes", error instanceof Error ? error.message : "Conversación inválida.");
  }

  if (!body) {
    redirectWithError(`/mensajes/${conversationId}`, "Escribe un mensaje antes de enviarlo.");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("direct_conversations")
    .select("id,listing_id,buyer_id,seller_id,listings(title)")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    logSupabaseError("Load conversation error:", conversationError ?? new Error("conversation_not_found"), {
      table: "direct_conversations",
      conversationId,
      senderId: userId
    });
    redirectWithError(`/mensajes/${conversationId}`, "No se pudo cargar la conversación. Inténtalo nuevamente.");
  }

  const { data: createdMessage, error } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body
    })
    .select("id")
    .single();

  if (error || !createdMessage) {
    logSupabaseError("Send message error:", error, {
      table: "direct_messages",
      conversationId,
      senderId: userId
    });
    redirectWithError(`/mensajes/${conversationId}`, "No se pudo enviar el mensaje. Inténtalo nuevamente.");
  }

  const conversationRow = conversation as unknown as {
    listing_id: string | null;
    buyer_id: string;
    seller_id: string;
    listings?: { title?: string } | null;
  };
  const recipientId = conversationRow.buyer_id === userId ? conversationRow.seller_id : conversationRow.buyer_id;

  await createDirectMessageNotification({
    supabase,
    recipientId,
    senderId: userId,
    conversationId,
    messageId: createdMessage.id,
    listingId: conversationRow.listing_id,
    listingTitle: conversationRow.listings?.title ?? "la publicación"
  });

  const { error: updateError } = await supabase
    .from("direct_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (updateError) {
    logSupabaseError("Create conversation error:", updateError, {
      table: "direct_conversations",
      action: "touchUpdatedAt",
      conversationId,
      senderId: userId
    });
  }

  revalidatePath(`/mensajes/${conversationId}`);
  revalidatePath("/mensajes");
  redirect(`/mensajes/${conversationId}?ok=mensaje`);
}

export async function createListingOffer(formData: FormData) {
  const listingId = getString(formData, "listing_id");
  const offerType = getString(formData, "offer_type");
  const credits = getPositiveInteger(formData, "credits");
  const offeredItemDescription = formText(formData, "offered_item_description", 800);
  const message = formText(formData, "message", 800);
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit(`/articulos/${listingId || ""}`, `offer-create:${userId}`, 12, 60_000);

  try {
    validateUuid(listingId, "Publicación");
  } catch (error) {
    redirectWithError("/explorar", error instanceof Error ? error.message : "Publicación inválida.");
  }

  const listing = await getListingParticipantData(supabase, listingId).catch((error) => {
    redirectWithError(
      `/articulos/${listingId}`,
      error instanceof Error ? error.message : "No se encontró la publicación."
    );
  });

  if (listing.seller_id === userId) {
    redirectWithError(`/articulos/${listingId}`, "No puedes hacer una oferta por tu propia publicación.");
  }

  if (!["credits", "item", "mixed"].includes(offerType)) {
    redirectWithError(`/articulos/${listingId}`, "Elige un tipo de oferta válido.");
  }

  if ((offerType === "credits" || offerType === "mixed") && credits <= 0) {
    redirectWithError(
      `/articulos/${listingId}`,
      "Indica cuántos créditos quieres ofrecer. Debe ser un número entero mayor o igual a 1."
    );
  }

  if ((offerType === "item" || offerType === "mixed") && !offeredItemDescription) {
    redirectWithError(`/articulos/${listingId}`, "Describe el artículo que quieres ofrecer.");
  }

  if (offerType === "credits" || offerType === "mixed") {
    const { data: account, error: accountError } = await supabase
      .from("credit_accounts")
      .select("available")
      .eq("user_id", userId)
      .maybeSingle();

    if (accountError) {
      logSupabaseError("Create offer error:", accountError, {
        table: "credit_accounts",
        action: "checkAvailableCredits",
        listingId,
        senderId: userId,
        offerType,
        credits
      });
      redirectWithError(`/articulos/${listingId}`, "No se pudo validar tu saldo de créditos. Inténtalo nuevamente.");
    }

    if (!account || account.available < credits) {
      redirectWithError(
        `/articulos/${listingId}`,
        "No tienes suficientes créditos disponibles para realizar esta oferta."
      );
    }
  }

  const { data: createdOffer, error } = await supabase
    .from("listing_offers")
    .insert({
      listing_id: listingId,
      sender_id: userId,
      receiver_id: listing.seller_id,
      offer_type: offerType,
      credits: offerType === "item" ? 0 : credits,
      offered_item_description: offeredItemDescription || null,
      message: message || null
    })
    .select("id")
    .single();

  if (error || !createdOffer) {
    logSupabaseError("Create offer error:", error, {
      table: "listing_offers",
      listingId,
      senderId: userId,
      receiverId: listing.seller_id,
      offerType,
      credits: offerType === "item" ? 0 : credits,
      hasItemDescription: Boolean(offeredItemDescription),
      hasMessage: Boolean(message)
    });
    redirectWithError(`/articulos/${listingId}`, "No se pudo enviar la oferta. Inténtalo nuevamente.");
  }

  await createOfferNotification({
    supabase,
    offerId: createdOffer.id,
    listingId,
    receiverId: listing.seller_id,
    senderId: userId,
    listingTitle: listing.title
  });

  revalidatePath(`/articulos/${listingId}`);
  revalidatePath("/ofertas");
  revalidatePath("/perfil");
  redirect(`/articulos/${listingId}?ok=oferta`);
}

export async function submitListingReport(formData: FormData) {
  const listingId = getString(formData, "listing_id");
  const reason = formText(formData, "reason", 120);
  const details = formText(formData, "details", 1200);
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit("/seguridad", `report-create:${userId}`, 5, 60_000);

  if (!reason) {
    redirectWithError("/seguridad", "Elige un motivo para enviar el reporte.");
  }

  if (listingId) {
    try {
      validateUuid(listingId, "Publicación");
    } catch (error) {
      redirectWithError("/seguridad", error instanceof Error ? error.message : "Publicación inválida.");
    }
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .maybeSingle();

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    reported_user_id: listing?.seller_id ?? null,
    listing_id: listingId || null,
    reason,
    details: details || null
  });

  if (error) {
    redirectWithError("/seguridad", error.message);
  }

  revalidatePath("/seguridad");
  redirect("/seguridad?ok=reporte");
}

export async function updateListingOfferStatus(formData: FormData) {
  const offerId = getString(formData, "offer_id");
  const status = getString(formData, "status");
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit("/ofertas", `offer-status:${userId}`, 20, 60_000);

  try {
    validateUuid(offerId, "Oferta");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Oferta inválida.");
  }

  if (status !== "accepted" && status !== "rejected") {
    redirectWithError("/ofertas", "Estado de oferta no válido.");
  }

  const { data: offerBeforeAction } = await supabase
    .from("listing_offers")
    .select("id,listing_id,sender_id,receiver_id,credits,listings(title)")
    .eq("id", offerId)
    .maybeSingle();

  const { error } = await supabase.rpc("seller_respond_listing_offer", {
    p_offer_id: offerId,
    p_status: status
  });

  if (error) {
    logSupabaseError("Seller accept credit offer error:", error, {
      rpc: "seller_respond_listing_offer",
      offerId,
      status,
      userId
    });

    const message =
      error.message === "insufficient_credits"
        ? "La persona que hizo la oferta no tiene créditos suficientes disponibles."
        : error.message === "listing_not_available"
          ? "La publicación ya no está disponible."
          : error.message;

    redirectWithError("/ofertas", message);
  }

  if (offerBeforeAction) {
    const offerRow = offerBeforeAction as unknown as {
      listing_id: string;
      sender_id: string;
      credits: number;
      listings?: { title?: string } | null;
    };
    await createUserNotification({
      supabase,
      userId: offerRow.sender_id,
      type: "offer_received",
      title: status === "accepted" ? "Oferta aceptada" : "Oferta rechazada",
      body:
        status === "accepted"
          ? `Tu oferta de ${offerRow.credits} créditos fue aceptada. Confirma para transferir los créditos.`
          : `Tu oferta por ${offerRow.listings?.title ?? "la publicación"} fue rechazada.`,
      listingId: offerRow.listing_id,
      offerId
    });
  }

  revalidatePath("/ofertas");
  revalidatePath("/billetera");
  redirect(`/ofertas?ok=${status}`);
}

export async function confirmListingCreditTransfer(formData: FormData) {
  const offerId = getString(formData, "offer_id");
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit("/ofertas", `offer-confirm:${userId}`, 20, 60_000);

  try {
    validateUuid(offerId, "Oferta");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Oferta invÃ¡lida.");
  }

  const { data: offerBeforeConfirm } = await supabase
    .from("listing_offers")
    .select("id,listing_id,sender_id,receiver_id,credits")
    .eq("id", offerId)
    .maybeSingle();

  const { error } = await supabase.rpc("buyer_confirm_credit_offer", {
    p_offer_id: offerId
  });

  if (error) {
    logSupabaseError("Buyer confirm credit transfer error:", error, {
      rpc: "buyer_confirm_credit_offer",
      offerId,
      userId
    });

    const message =
      error.message === "insufficient_credits"
        ? "No tienes suficientes créditos disponibles para completar esta oferta."
        : error.message === "offer_not_ready"
          ? "Esta oferta todavía no está lista para confirmar."
          : "No se pudo confirmar la transferencia. Inténtalo nuevamente.";

    redirectWithError("/ofertas", message);
  }

  if (offerBeforeConfirm) {
    const offerRow = offerBeforeConfirm as unknown as {
      listing_id: string;
      receiver_id: string;
      credits: number;
    };
    await createUserNotification({
      supabase,
      userId: offerRow.receiver_id,
      type: "offer_received",
      title: "Transferencia completada",
      body: `Se completó la transferencia de ${offerRow.credits} créditos por tu artículo.`,
      listingId: offerRow.listing_id,
      offerId
    });
  }

  revalidatePath("/ofertas");
  revalidatePath("/billetera");
  redirect("/ofertas?ok=completed");
}

export async function submitOfferRating(formData: FormData) {
  const offerId = getString(formData, "offer_id");
  const reviewedUserId = getString(formData, "reviewed_user_id");
  const rating = getPositiveInteger(formData, "rating");
  const comment = formText(formData, "comment", 600);
  const { supabase, userId } = await getCurrentUserId();
  enforceRateLimit("/ofertas", `offer-rating:${userId}`, 10, 60_000);

  try {
    validateUuid(offerId, "Oferta");
    validateUuid(reviewedUserId, "Usuario");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Calificación inválida.");
  }

  if (rating < 1 || rating > 5) {
    redirectWithError("/ofertas", "La calificación debe ser de 1 a 5 estrellas.");
  }

  const { data: offer, error: offerError } = await supabase
    .from("listing_offers")
    .select("id,sender_id,receiver_id,status")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    logSupabaseError("Submit rating error:", offerError ?? new Error("offer_not_found"), {
      table: "listing_offers",
      offerId,
      reviewerId: userId
    });
    redirectWithError("/ofertas", "No se pudo cargar la oferta para calificar.");
  }

  const offerRow = offer as { sender_id: string; receiver_id: string; status: string };
  const isParticipant = offerRow.sender_id === userId || offerRow.receiver_id === userId;
  const expectedReviewedUserId = offerRow.sender_id === userId ? offerRow.receiver_id : offerRow.sender_id;

  if (!isParticipant || reviewedUserId !== expectedReviewedUserId || reviewedUserId === userId) {
    redirectWithError("/ofertas", "No puedes calificar este intercambio.");
  }

  if (offerRow.status !== "completed") {
    redirectWithError("/ofertas", "Solo puedes calificar ofertas completadas.");
  }

  const { error } = await supabase.from("user_ratings").insert({
    offer_id: offerId,
    reviewer_id: userId,
    reviewed_user_id: reviewedUserId,
    rating,
    comment: comment || null
  });

  if (error) {
    logSupabaseError("Submit rating error:", error, {
      table: "user_ratings",
      offerId,
      reviewerId: userId,
      reviewedUserId,
      rating
    });
    redirectWithError(
      "/ofertas",
      error.code === "23505" ? "Ya calificaste este intercambio." : "No se pudo enviar la calificación."
    );
  }

  const { error: recalcError } = await supabase.rpc("recalculate_profile_rating", {
    p_user_id: reviewedUserId
  });

  if (recalcError) {
    logSupabaseError("Recalculate profile rating error:", recalcError, {
      rpc: "recalculate_profile_rating",
      reviewedUserId
    });
  }

  revalidatePath("/ofertas");
  revalidatePath("/perfil");
  redirect("/ofertas?ok=rating");
}
