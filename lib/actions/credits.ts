"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import {
  formText,
  getImageFiles,
  positiveInteger,
  signedInteger,
  validateCategory,
  validateCondition,
  validateUuid
} from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function enforceRateLimit(path: string, key: string, limit: number, windowMs: number) {
  const result = checkRateLimit({ key, limit, windowMs });
  if (!result.allowed) {
    redirectWithError(path, rateLimitMessage());
  }
}

function getString(formData: FormData, key: string) {
  return formText(formData, key, 1000);
}

function getPositiveInteger(formData: FormData, key: string) {
  return positiveInteger(formData, key);
}

function getOptionalPositiveInteger(formData: FormData, key: string) {
  const raw = formText(formData, key, 20);
  if (!raw) {
    return null;
  }

  if (!/^[1-9]\d*$/.test(raw)) {
    return 0;
  }

  return Number(raw);
}

function getSignedInteger(formData: FormData, key: string) {
  return signedInteger(formData, key);
}

function getSupabaseErrorInfo(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {
      message: String(error),
      code: null,
      details: null,
      hint: null,
      error
    };
  }

  const record = error as Record<string, unknown>;

  return {
    message: typeof record.message === "string" ? record.message : String(error),
    code: record.code ?? null,
    details: record.details ?? null,
    hint: record.hint ?? null,
    error
  };
}

function logSupabaseError(label: string, error: unknown, context: Record<string, unknown>) {
  const info = getSupabaseErrorInfo(error);

  console.error(label, {
    message: info.message,
    code: info.code,
    details: info.details,
    hint: info.hint,
    error: info.error,
    ...context
  });
}

function logPlatformIntakeError(error: unknown, context: Record<string, unknown>) {
  const info = getSupabaseErrorInfo(error);
  const stack = error instanceof Error ? error.stack : null;

  console.error("Platform intake error:", {
    message: info.message,
    code: info.code,
    details: info.details,
    hint: info.hint,
    stack,
    error: info.error,
    ...context
  });
}

function isSearchListingText(value: string | null | undefined) {
  return Boolean(value && /\b(busco|busca|buscando|necesito|necesita)\b/i.test(value));
}

function isSearchListing(payload: {
  title: string;
  category: string;
  description: string;
  looking_for: string | null;
}) {
  return (
    isSearchListingText(payload.title) ||
    isSearchListingText(payload.category) ||
    isSearchListingText(payload.description) ||
    isSearchListingText(payload.looking_for)
  );
}

async function getPublishingPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase.from("profiles").select("role,plan").eq("id", userId).maybeSingle();

  if (!error) {
    return {
      role: data?.role === "admin" ? "admin" : "user",
      plan: data?.plan === "premium" ? "premium" : "free"
    };
  }

  logSupabaseError("[Intercambio CR publishListing profile plan lookup error]", error, {
    table: "profiles",
    userId
  });

  const fallback = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (fallback.error) {
    logSupabaseError("[Intercambio CR publishListing profile role lookup error]", fallback.error, {
      table: "profiles",
      userId
    });
  }

  return {
    role: fallback.data?.role === "admin" ? "admin" : "user",
    plan: "free"
  };
}

async function enforcePublicationLimits({
  supabase,
  userId,
  payload
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  payload: {
    title: string;
    category: string;
    description: string;
    looking_for: string | null;
  };
}) {
  const { role, plan } = await getPublishingPlan(supabase, userId);

  if (role === "admin" || plan === "premium") {
    return;
  }

  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,description,looking_for,status")
    .eq("seller_id", userId)
    .not("status", "in", "(removed,cancelled,completed)");

  if (error) {
    logSupabaseError("[Intercambio CR publishListing limit query error]", error, {
      table: "listings",
      userId,
      filter: "seller_id=userId and status not in removed,cancelled,completed"
    });
    redirectWithError("/publicar", "No se pudo validar tu límite de publicaciones. Inténtalo nuevamente.");
  }

  const activeListings = data ?? [];

  if (activeListings.length >= 3) {
    redirectWithError(
      "/publicar",
      "Alcanzaste el límite de publicaciones gratuitas. Puedes eliminar una publicación o actualizar tu plan."
    );
  }

  if (isSearchListing(payload)) {
    const activeSearchListings = activeListings.filter((listing) =>
      isSearchListing({
        title: listing.title ?? "",
        category: listing.category ?? "",
        description: listing.description ?? "",
        looking_for: listing.looking_for ?? null
      })
    );

    if (activeSearchListings.length >= 3) {
      redirectWithError(
        "/publicar",
        "Alcanzaste el límite de publicaciones gratuitas. Puedes eliminar una publicación o actualizar tu plan."
      );
    }
  }
}

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = 8 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP");
  }

  if (file.size > maxBytes) {
    throw new Error("Cada imagen debe pesar 8 MB o menos");
  }
}

async function uploadImages({
  supabase,
  bucket,
  ownerId,
  entityId,
  files
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  bucket: string;
  ownerId: string;
  entityId: string;
  files: File[];
}) {
  const uploadedPaths: string[] = [];
  const {
    data: { user: storageUser }
  } = await supabase.auth.getUser();

  for (const [index, file] of files.entries()) {
    validateImage(file);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${ownerId}/${entityId}/${index}-${crypto.randomUUID()}.${extension}`;
    const firstFolder = path.split("/")[0];

    console.info("[Intercambio CR uploadImages]", {
      table: "storage.objects",
      authUserId: storageUser?.id ?? null,
      ownerId,
      bucket,
      path,
      firstFolder,
      firstFolderMatchesOwner: firstFolder === ownerId,
      authMatchesOwner: storageUser?.id === ownerId
    });

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (error) {
      logSupabaseError("[Intercambio CR uploadImages error]", error, {
        table: "storage.objects",
        authUserId: storageUser?.id ?? null,
        ownerId,
        bucket,
        path
      });
      throw error;
    }

    uploadedPaths.push(path);
  }

  return uploadedPaths;
}

export async function submitPlatformIntake(formData: FormData) {
  const supabase = await createClient();
  let userId: string | null = null;

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect("/auth?redirect=/entregar&error=Inicia%20sesi%C3%B3n%20para%20entregar%20un%20art%C3%ADculo.");
  }
  enforceRateLimit("/entregar", `intake-submit:${userId}`, 5, 60_000);

  const payload = {
    user_id: userId,
    title: formText(formData, "title", 120),
    category: formText(formData, "category", 80),
    condition: formText(formData, "condition", 80),
    description: formText(formData, "description", 2000),
    requested_notes: formText(formData, "requested_notes", 1200) || null
  };

  try {
    validateCategory(payload.category);
    validateCondition(payload.condition);
  } catch (error) {
    redirectWithError("/entregar", error instanceof Error ? error.message : "Datos inválidos.");
  }

  if (!payload.title || !payload.description) {
    redirectWithError("/entregar", "Completa el título y la descripción del artículo.");
  }

  const { data, error } = await supabase
    .from("platform_intakes")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    logPlatformIntakeError(error, {
      table: "platform_intakes",
      userId,
      payload: {
        user_id: payload.user_id,
        title: payload.title,
        category: payload.category,
        condition: payload.condition,
        description: payload.description ? "[redacted]" : "",
        requested_notes: payload.requested_notes ? "[redacted]" : null
      }
    });
    redirectWithError("/entregar", "No se pudo enviar la solicitud. Inténtalo nuevamente.");
  }

  let files: File[] = [];
  try {
    files = getImageFiles(formData, "images", 6);
  } catch (error) {
    logPlatformIntakeError(error, {
      table: "client_formdata",
      userId,
      field: "images"
    });
    redirectWithError("/entregar", error instanceof Error ? error.message : "Imágenes inválidas.");
  }
  if (files.length > 0) {
    let paths: string[] = [];

    try {
      paths = await uploadImages({
        supabase,
        bucket: "intake-images",
        ownerId: userId,
        entityId: data.id,
        files
      });
    } catch (uploadError) {
      logPlatformIntakeError(uploadError, {
        table: "storage.objects",
        bucket: "intake-images",
        userId,
        intakeId: data.id,
        expectedFirstFolder: userId,
        fileCount: files.length
      });
      redirectWithError("/entregar", "No se pudo subir la imagen. Inténtalo nuevamente.");
    }

    const { error: imageError } = await supabase.from("intake_images").insert(
      paths.map((path, index) => ({
        intake_id: data.id,
        storage_path: path,
        sort_order: index
      }))
    );

    if (imageError) {
      logPlatformIntakeError(imageError, {
        table: "intake_images",
        userId,
        intakeId: data.id,
        paths
      });

      try {
        const { error: cleanupError } = await supabase.storage.from("intake-images").remove(paths);

        if (cleanupError) {
          logPlatformIntakeError(cleanupError, {
            table: "storage.objects",
            bucket: "intake-images",
            userId,
            intakeId: data.id,
            paths
          });
        }
      } catch (cleanupError) {
        logPlatformIntakeError(cleanupError, {
          table: "storage.objects",
          bucket: "intake-images",
          userId,
          intakeId: data.id,
          paths
        });
      }

      redirectWithError("/entregar", "No se pudo guardar la imagen. Inténtalo nuevamente.");
    }
  }

  revalidatePath("/entregar");
  redirect("/entregar?ok=solicitud");
}

export async function publishListing(formData: FormData) {
  const supabase = await createClient();
  let userId: string | null = null;

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    redirect("/auth?redirect=/publicar&error=Inicia%20sesi%C3%B3n%20para%20publicar%20un%20art%C3%ADculo.");
  }
  enforceRateLimit("/publicar", `listing-publish:${userId}`, 8, 60_000);

  const creditPrice = getOptionalPositiveInteger(formData, "credit_price");
  const lookingFor = formText(formData, "looking_for", 500);

  if (creditPrice === 0) {
    redirectWithError(
      "/publicar",
      "Ingresa un monto válido en créditos. Debe ser un número entero mayor o igual a 1, o déjalo vacío."
    );
  }

  const payload = {
    seller_id: userId,
    title: formText(formData, "title", 120),
    category: formText(formData, "category", 80),
    condition: formText(formData, "condition", 80),
    credit_price: creditPrice,
    location: formText(formData, "location", 120),
    description: formText(formData, "description", 2000),
    looking_for: lookingFor || null,
    status: "available"
  };

  try {
    validateCategory(payload.category);
    validateCondition(payload.condition);
  } catch (error) {
    redirectWithError("/publicar", error instanceof Error ? error.message : "Datos inválidos.");
  }

  if (!payload.title || !payload.location || !payload.description) {
    redirectWithError("/publicar", "Completa título, ubicación y descripción.");
  }

  await enforcePublicationLimits({
    supabase,
    userId,
    payload
  });

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    logSupabaseError("[Intercambio CR publishListing insert error]", error, {
      table: "listings",
      userId,
      payload: {
        seller_id: payload.seller_id,
        title: payload.title,
        category: payload.category,
        condition: payload.condition,
        credit_price: payload.credit_price,
        location: payload.location,
        description: payload.description ? "[redacted]" : "",
        looking_for: payload.looking_for ? "[redacted]" : null,
        status: payload.status
      }
    });
    redirectWithError("/publicar", "No se pudo publicar el artículo. Inténtalo nuevamente.");
  }

  let files: File[] = [];
  try {
    files = getImageFiles(formData, "images", 6);
  } catch (error) {
    redirectWithError("/publicar", error instanceof Error ? error.message : "Imágenes inválidas.");
  }
  if (files.length > 0) {
    let paths: string[] = [];

    try {
      paths = await uploadImages({
        supabase,
        bucket: "listing-images",
        ownerId: userId,
        entityId: data.id,
        files
      });
    } catch (uploadError) {
      logSupabaseError("[Intercambio CR publishListing storage upload error]", uploadError, {
        table: "storage.objects",
        bucket: "listing-images",
        authUserId: userId,
        listingId: data.id,
        expectedFirstFolder: userId,
        fileCount: files.length
      });
      redirectWithError("/publicar", "No se pudo publicar el artículo. Inténtalo nuevamente.");
    }

    console.info("[Intercambio CR publishListing images insert]", {
      table: "listing_images",
      authUserId: userId,
      listingId: data.id,
      paths,
      firstFolders: paths.map((path) => path.split("/")[0])
    });

    const { error: imageError } = await supabase.from("listing_images").insert(
      paths.map((path, index) => ({
        listing_id: data.id,
        storage_path: path,
        sort_order: index
      }))
    );

    if (imageError) {
      logSupabaseError("[Intercambio CR publishListing images insert error]", imageError, {
        table: "listing_images",
        authUserId: userId,
        listingId: data.id,
        paths
      });

      try {
        const { error: cleanupError } = await supabase.storage.from("listing-images").remove(paths);

        if (cleanupError) {
          logSupabaseError("[Intercambio CR publishListing image cleanup error]", cleanupError, {
            table: "storage.objects",
            authUserId: userId,
            listingId: data.id,
            bucket: "listing-images",
            paths
          });
        }
      } catch (cleanupError) {
        logSupabaseError("[Intercambio CR publishListing image cleanup exception]", cleanupError, {
          table: "storage.objects",
          authUserId: userId,
          listingId: data.id,
          bucket: "listing-images",
          paths
        });
      }
      redirectWithError("/publicar", "No se pudo publicar el artículo. Inténtalo nuevamente.");
    }
  }

  revalidatePath("/explorar");
  redirect("/publicar?ok=publicacion");
}

export async function removeOwnListing(formData: FormData) {
  const supabase = await createClient();
  const listingId = getString(formData, "listing_id");

  try {
    validateUuid(listingId, "Publicación");
  } catch (error) {
    redirectWithError("/mis-publicaciones", error instanceof Error ? error.message : "Publicación inválida.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirect=/mis-publicaciones&error=Inicia%20sesi%C3%B3n%20para%20eliminar%20tu%20publicaci%C3%B3n.");
  }

  enforceRateLimit("/mis-publicaciones", `listing-remove:${user.id}`, 20, 60_000);

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,seller_id,status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    redirectWithError("/mis-publicaciones", "No se encontró la publicación.");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOwner = listing.seller_id === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isOwner && !isAdmin) {
    redirectWithError("/mis-publicaciones", "No tienes permiso para eliminar esta publicación.");
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", listingId);

  if (error) {
    console.error("[Intercambio CR removeOwnListing]", {
      table: "listings",
      userId: user.id,
      listingId,
      message: error.message
    });
    redirectWithError("/mis-publicaciones", "No se pudo eliminar la publicación. Inténtalo nuevamente.");
  }

  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/mis-publicaciones");
  redirect("/mis-publicaciones?ok=eliminada");
}

export async function createPurchaseRequest(formData: FormData) {
  const supabase = await createClient();
  const listingId = getString(formData, "listing_id");
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  enforceRateLimit("/explorar", `purchase-create:${user.id}`, 12, 60_000);

  try {
    validateUuid(listingId, "Publicación");
  } catch (error) {
    redirectWithError("/explorar", error instanceof Error ? error.message : "Publicación inválida.");
  }

  const { data, error } = await supabase.rpc("create_purchase_request", {
    p_listing_id: listingId
  });

  if (error) {
    const message =
      error.message === "insufficient_credits"
        ? "No tienes créditos suficientes disponibles para solicitar este artículo."
        : error.message;

    redirectWithError("/explorar", message);
  }

  revalidatePath("/billetera");
  redirect(`/compras/${data}`);
}

export async function acceptPurchase(formData: FormData) {
  const supabase = await createClient();
  const purchaseId = getString(formData, "purchase_id");
  try {
    validateUuid(purchaseId, "Compra");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Compra inválida.");
  }

  const { error } = await supabase.rpc("seller_accept_purchase", {
    p_purchase_id: purchaseId
  });

  if (error) {
    const message =
      error.message === "held_credits_missing"
        ? "No se encontraron créditos retenidos suficientes para completar esta operación."
        : error.message;

    redirectWithError(`/compras/${purchaseId}`, message);
  }

  revalidatePath(`/compras/${purchaseId}`);
}

export async function confirmPurchase(formData: FormData) {
  const supabase = await createClient();
  const purchaseId = getString(formData, "purchase_id");
  try {
    validateUuid(purchaseId, "Compra");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Compra inválida.");
  }

  const { error } = await supabase.rpc("confirm_purchase", {
    p_purchase_id: purchaseId
  });

  if (error) {
    const message =
      error.message === "held_credits_missing"
        ? "No se encontraron créditos retenidos suficientes para cancelar esta operación."
        : error.message;

    redirectWithError(`/compras/${purchaseId}`, message);
  }

  revalidatePath(`/compras/${purchaseId}`);
  revalidatePath("/billetera");
}

export async function cancelPurchase(formData: FormData) {
  const supabase = await createClient();
  const purchaseId = getString(formData, "purchase_id");
  const note = formText(formData, "note", 800);
  try {
    validateUuid(purchaseId, "Compra");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Compra inválida.");
  }

  const { error } = await supabase.rpc("cancel_purchase", {
    p_purchase_id: purchaseId,
    p_note: note || null
  });

  if (error) {
    redirectWithError(`/compras/${purchaseId}`, error.message);
  }

  revalidatePath(`/compras/${purchaseId}`);
  revalidatePath("/billetera");
}

export async function disputePurchase(formData: FormData) {
  const supabase = await createClient();
  const purchaseId = getString(formData, "purchase_id");
  const reason = formText(formData, "reason", 1000);
  try {
    validateUuid(purchaseId, "Compra");
  } catch (error) {
    redirectWithError("/ofertas", error instanceof Error ? error.message : "Compra inválida.");
  }

  const { error } = await supabase.rpc("dispute_purchase", {
    p_purchase_id: purchaseId,
    p_reason: reason
  });

  if (error) {
    redirectWithError(`/compras/${purchaseId}`, error.message);
  }

  revalidatePath(`/compras/${purchaseId}`);
}

export async function adminMakeIntakeOffer(formData: FormData) {
  const supabase = await createClient();
  const intakeId = getString(formData, "intake_id");
  const offeredCredits = getPositiveInteger(formData, "offered_credits");
  const notes = formText(formData, "notes", 1000);

  try {
    validateUuid(intakeId, "Solicitud");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Solicitud inválida.");
  }

  if (offeredCredits < 1) {
    redirectWithError("/admin", "Ingresa una oferta válida: número entero mayor o igual a 1 crédito.");
  }

  const { error } = await supabase.rpc("admin_make_intake_offer", {
    p_intake_id: intakeId,
    p_offered_credits: offeredCredits,
    p_notes: notes || null
  });

  if (error) {
    const message =
      error.message === "credit_account_not_found_or_negative_balance"
        ? "El ajuste dejaría el saldo negativo o la cuenta de créditos no existe."
        : error.message;

    redirectWithError("/admin", message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/entregas/${intakeId}`);
  revalidatePath("/notificaciones");
  redirect("/admin?ok=oferta");
}

export async function adminIssueIntakeCredits(formData: FormData) {
  const supabase = await createClient();
  const intakeId = getString(formData, "intake_id");
  try {
    validateUuid(intakeId, "Solicitud");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Solicitud inválida.");
  }

  const { error } = await supabase.rpc("admin_issue_intake_credits", {
    p_intake_id: intakeId
  });

  if (error) {
    const message =
      error.message === "intake_locked"
        ? "Primero debes aprobar la entrega guardando una oferta administrativa válida."
        : error.message === "missing_offer"
          ? "Primero debes guardar una oferta en créditos para esta entrega."
          : error.message;

    redirectWithError("/admin", message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/entregas/${intakeId}`);
  revalidatePath("/billetera");
  revalidatePath("/notificaciones");
  redirect("/admin?ok=emision");
}

export async function adminAdjustCredits(formData: FormData) {
  const supabase = await createClient();
  const userId = getString(formData, "user_id");
  const amount = getSignedInteger(formData, "amount");
  const note = formText(formData, "note", 1000);
  try {
    validateUuid(userId, "Usuario");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Usuario inválido.");
  }

  if (!userId || amount === 0 || !note) {
    redirectWithError(
      "/admin",
      "Ingresa un usuario, una nota y un monto entero distinto de 0. Usa negativo solo para reversos."
    );
  }

  const { error } = await supabase.rpc("admin_adjust_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_note: note || null
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/billetera");
  redirect("/admin?ok=ajuste-creditos");
}

export async function adminBlockUser(formData: FormData) {
  const supabase = await createClient();
  const userId = getString(formData, "user_id");
  const blocked = getString(formData, "blocked") === "true";
  try {
    validateUuid(userId, "Usuario");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Usuario inválido.");
  }

  const { error } = await supabase.rpc("admin_set_user_blocked", {
    p_user_id: userId,
    p_blocked: blocked
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=usuario");
}

export async function adminUpdateListingStatus(formData: FormData) {
  const supabase = await createClient();
  const listingId = getString(formData, "listing_id");
  const status = getString(formData, "status");
  try {
    validateUuid(listingId, "Publicación");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Publicación inválida.");
  }

  const { error } = await supabase.rpc("admin_update_listing_status", {
    p_listing_id: listingId,
    p_status: status
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/explorar");
  redirect("/admin?ok=publicacion");
}

export async function adminUpdateReportStatus(formData: FormData) {
  const supabase = await createClient();
  const reportId = getString(formData, "report_id");
  const status = getString(formData, "status");
  try {
    validateUuid(reportId, "Reporte");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Reporte inválido.");
  }

  const { error } = await supabase.rpc("admin_update_report_status", {
    p_report_id: reportId,
    p_status: status
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=reporte");
}

export async function adminRejectIntake(formData: FormData) {
  const supabase = await createClient();
  const intakeId = getString(formData, "intake_id");
  const notes = formText(formData, "notes", 1000);
  try {
    validateUuid(intakeId, "Solicitud");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Solicitud inválida.");
  }

  const { error } = await supabase.rpc("admin_reject_intake", {
    p_intake_id: intakeId,
    p_notes: notes || null
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/entregas/${intakeId}`);
  revalidatePath("/notificaciones");
  redirect("/admin?ok=entrega-rechazada");
}

export async function adminRequestIntakeInfo(formData: FormData) {
  const supabase = await createClient();
  const intakeId = getString(formData, "intake_id");
  const notes = formText(formData, "notes", 1000);
  try {
    validateUuid(intakeId, "Solicitud");
  } catch (error) {
    redirectWithError("/admin", error instanceof Error ? error.message : "Solicitud inválida.");
  }

  if (!notes) {
    redirectWithError("/admin", "Escribe qué información necesita revisar Intercambio CR.");
  }

  const { error } = await supabase.rpc("admin_request_intake_info", {
    p_intake_id: intakeId,
    p_notes: notes
  });

  if (error) {
    redirectWithError("/admin", error.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/entregas/${intakeId}`);
  revalidatePath("/notificaciones");
  redirect("/admin?ok=mas-informacion");
}
