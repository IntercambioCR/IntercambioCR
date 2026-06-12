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
    throw new Error(error?.message ?? "No se encontró la publicación.");
  }

  return data;
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
    redirectWithError(`/articulos/${listingId}`, existingError.message);
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
      redirectWithError(
        `/articulos/${listingId}`,
        createError?.message ?? "No se pudo abrir la conversación."
      );
    }

    conversationId = created.id;
  }

  if (initialMessage) {
    const { error: messageError } = await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: initialMessage
    });

    if (messageError) {
      redirectWithError(`/articulos/${listingId}`, messageError.message);
    }
  }

  revalidatePath("/mensajes");
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

  const { error } = await supabase.from("direct_messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body
  });

  if (error) {
    redirectWithError(`/mensajes/${conversationId}`, error.message);
  }

  await supabase
    .from("direct_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/mensajes/${conversationId}`);
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

  const { error } = await supabase.from("listing_offers").insert({
    listing_id: listingId,
    sender_id: userId,
    receiver_id: listing.seller_id,
    offer_type: offerType,
    credits: offerType === "item" ? 0 : credits,
    offered_item_description: offeredItemDescription || null,
    message: message || null
  });

  if (error) {
    redirectWithError(`/articulos/${listingId}`, error.message);
  }

  revalidatePath(`/articulos/${listingId}`);
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

  const { error } = await supabase.rpc("respond_listing_offer", {
    p_offer_id: offerId,
    p_status: status
  });

  if (error) {
    const message =
      error.message === "insufficient_credits"
        ? "La persona que hizo la oferta no tiene créditos suficientes disponibles."
        : error.message === "listing_not_available"
          ? "La publicación ya no está disponible."
          : error.message;

    redirectWithError("/ofertas", message);
  }

  revalidatePath("/ofertas");
  revalidatePath("/billetera");
  redirect(`/ofertas?ok=${status}`);
}
