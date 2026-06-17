import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type RelatedImage = { storage_path: string; sort_order: number | null };

export type MyIntake = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  created: string;
  offeredCredits: string;
  inspectionNotes: string | null;
  images: string[];
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

function orderedPaths(images: RelatedImage[] | null | undefined) {
  return (images ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((image) => image.storage_path);
}

function logIntakeImagesLoadError(error: unknown, context: Record<string, unknown>) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  console.error("Intake images load error:", {
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
    .select("id,title,status,created_at,offered_credits,inspection_notes,intake_images(storage_path,sort_order)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logIntakeImagesLoadError(error, {
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
      const { data: signedData, error: signedError } = paths.length
        ? await storage.createSignedUrls(paths, 60 * 60)
        : { data: [], error: null };

      if (signedError) {
        logIntakeImagesLoadError(signedError, {
          bucket: "intake-images",
          paths,
          intakeId: intake.id,
          userId: user.id,
          source: "getMyPlatformIntakes"
        });
      }

      return {
        id: intake.id,
        title: intake.title,
        status: intake.status,
        statusLabel: statusLabel(intake.status),
        created: formatDate(intake.created_at),
        offeredCredits: intake.offered_credits ? `${intake.offered_credits} credis` : "Sin oferta todavía",
        inspectionNotes: intake.inspection_notes,
        images: (signedData ?? [])
          .map((item) => item.signedUrl)
          .filter((url): url is string => Boolean(url))
      };
    })
  );
}
