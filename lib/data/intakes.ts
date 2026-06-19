import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCostaRicaDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type RelatedImage = { storage_path: string; sort_order: number | null };
type RelatedConversation = { id: string } | { id: string }[] | null | undefined;

export type MyIntake = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  created: string;
  offeredCredits: string;
  inspectionNotes: string | null;
  images: string[];
  conversationId: string | null;
};

function formatDate(value: string | null | undefined) {
  return value ? formatCostaRicaDate(value) : "Sin fecha";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: "En revisión",
    needs_info: "Requiere información",
    scheduled: "Requiere información",
    offer_made: "Aprobada",
    approved: "Aprobada",
    rejected: "Rechazada",
    credited: "Créditos emitidos",
    paid: "Créditos emitidos"
  };

  return labels[status] ?? status;
}

function relatedConversationId(conversation: RelatedConversation) {
  if (Array.isArray(conversation)) {
    return conversation[0]?.id ?? null;
  }

  return conversation?.id ?? null;
}

function orderedPaths(images: RelatedImage[] | null | undefined) {
  return (images ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((image) => normalizeIntakeStoragePath(image.storage_path))
    .filter((path): path is string => Boolean(path));
}

function normalizeIntakeStoragePath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const marker = "/object/";
    const markerIndex = url.pathname.indexOf(marker);
    const storagePath = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) : url.pathname;
    const bucketPrefix = "intake-images/";
    const bucketIndex = storagePath.indexOf(bucketPrefix);

    return decodeURIComponent(bucketIndex >= 0 ? storagePath.slice(bucketIndex + bucketPrefix.length) : storagePath.replace(/^\/+/, ""));
  } catch {
    return trimmed.replace(/^intake-images\//, "").replace(/^\/+/, "");
  }
}

function logIntakeImageLoadError(error: unknown, context: Record<string, unknown>) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  console.error("Intake image load error:", {
    message: typeof record?.message === "string" ? record.message : String(error),
    code: record?.code ?? null,
    details: record?.details ?? null,
    hint: record?.hint ?? null,
    stack: error instanceof Error ? error.stack : null,
    error,
    ...context
  });
}

export async function getMyPlatformIntakes(): Promise<MyIntake[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("platform_intakes")
    .select("id,title,status,created_at,offered_credits,inspection_notes,intake_images(storage_path,sort_order),intake_conversations(id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logIntakeImageLoadError(error, {
      table: "platform_intakes",
      relation: "intake_images",
      userId: user.id,
      source: "getMyPlatformIntakes"
    });
    return [];
  }

  const storage = supabase.storage.from("intake-images");

  return Promise.all(
    (data ?? []).map(async (intake) => {
      const paths = orderedPaths(intake.intake_images);
      const signedImages = await Promise.all(
        paths.map(async (path) => {
          const { data: signedData, error: signedError } = await storage.createSignedUrl(path, 60 * 60);

          if (signedError || !signedData?.signedUrl) {
            logIntakeImageLoadError(signedError ?? new Error("missing_signed_url"), {
              bucket: "intake-images",
              path,
              intakeId: intake.id,
              userId: user.id,
              source: "getMyPlatformIntakes"
            });
            return null;
          }

          return signedData.signedUrl;
        })
      );

      return {
        id: intake.id,
        title: intake.title,
        status: intake.status,
        statusLabel: statusLabel(intake.status),
        created: formatDate(intake.created_at),
        offeredCredits: intake.offered_credits ? `${intake.offered_credits} credis` : "Sin oferta todavía",
        inspectionNotes: intake.inspection_notes,
        images: signedImages.filter((url): url is string => Boolean(url)),
        conversationId: relatedConversationId(intake.intake_conversations as RelatedConversation)
      };
    })
  );
}
