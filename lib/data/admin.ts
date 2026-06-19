import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCostaRicaDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type RelatedProfile = { full_name: string | null } | { full_name: string | null }[] | null;
type RelatedImage = { storage_path: string; sort_order: number | null };
type RelatedConversation = { id: string } | { id: string }[] | null | undefined;

function relatedName(profile: RelatedProfile, fallback = "Usuario") {
  if (Array.isArray(profile)) {
    return profile[0]?.full_name ?? fallback;
  }

  return profile?.full_name ?? fallback;
}

function relatedConversationId(conversation: RelatedConversation) {
  if (Array.isArray(conversation)) {
    return conversation[0]?.id ?? null;
  }

  return conversation?.id ?? null;
}

function orderedStoragePaths(paths: RelatedImage[] | null | undefined) {
  if (!paths?.length) {
    return [];
  }

  return paths
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

async function signedIntakeImageUrls(
  storage: ReturnType<Awaited<ReturnType<typeof createClient>>["storage"]["from"]>,
  paths: string[],
  context: Record<string, unknown>
) {
  if (!paths.length) {
    return [];
  }

  const urls = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await storage.createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        logIntakeImageLoadError(error ?? new Error("missing_signed_url"), {
          bucket: "intake-images",
          path,
          ...context
        });
        return null;
      }

      return data.signedUrl;
    })
  );

  return urls.filter((url): url is string => Boolean(url));
}

export type AdminData = {
  metrics: {
    users: number;
    listings: number;
    reports: number;
    trades: number;
  };
  users: Array<{
    id: string;
    name: string;
    role: string;
    blocked: boolean;
    created: string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
  }>;
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    created: string;
  }>;
  trades: Array<{
    id: string;
    status: string;
    credits: string;
    created: string;
  }>;
  intakes: Array<{
    id: string;
    user: string;
    title: string;
    category: string;
    offer: string;
    status: string;
    created: string;
    images: string[];
  }>;
  creditMovements: Array<{
    id: string;
    user: string;
    amount: string;
    note: string;
    created: string;
  }>;
};

const emptyAdminData: AdminData = {
  metrics: { users: 0, listings: 0, reports: 0, trades: 0 },
  users: [],
  listings: [],
  reports: [],
  trades: [],
  intakes: [],
  creditMovements: []
};

function formatDate(value: string | null | undefined) {
  return value ? formatCostaRicaDate(value) : "Sin fecha";
}

export async function getAdminData(query = ""): Promise<AdminData> {
  if (!isSupabaseConfigured()) {
    return emptyAdminData;
  }

  const supabase = await createClient();
  const userQuery = supabase
    .from("profiles")
    .select("id,full_name,role,is_blocked,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (query) {
    userQuery.or(`full_name.ilike.%${query}%,id.eq.${query}`);
  }

  const [
    usersResult,
    listingsResult,
    reportsResult,
    purchasesResult,
    intakesResult,
    movementsResult,
    userCount,
    listingCount,
    reportCount,
    tradeCount
  ] = await Promise.all([
    userQuery,
    supabase.from("listings").select("id,title,category,status").order("created_at", { ascending: false }).limit(20),
    supabase.from("reports").select("id,reason,status,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("purchases").select("id,status,credits,created_at").order("created_at", { ascending: false }).limit(20),
    supabase
      .from("platform_intakes")
      .select("id,title,category,offered_credits,status,created_at,user:profiles!platform_intakes_user_id_fkey(full_name),intake_images(storage_path,sort_order)")
      .is("admin_archived_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("credit_movements")
      .select("id,user_id,amount,note,created_at,user:profiles!credit_movements_user_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    supabase.from("purchases").select("id", { count: "exact", head: true })
  ]);

  const storage = supabase.storage.from("intake-images");
  const intakes =
    await Promise.all(
      (intakesResult.data ?? []).map(async (intake) => {
        const paths = orderedStoragePaths(intake.intake_images);
        const images = await signedIntakeImageUrls(storage, paths, {
          intakeId: intake.id,
          source: "getAdminData"
        });

        return {
          id: intake.id,
          user: relatedName(intake.user),
          title: intake.title,
          category: intake.category,
          offer: intake.offered_credits ? `${intake.offered_credits} credis` : "Sin oferta",
          status: intake.status,
          created: formatDate(intake.created_at),
          images
        };
      })
    );

  if (intakesResult.error) {
    logIntakeImageLoadError(intakesResult.error, {
      table: "platform_intakes",
      relation: "intake_images",
      source: "getAdminData"
    });
  }

  return {
    metrics: {
      users: userCount.count ?? usersResult.data?.length ?? 0,
      listings: listingCount.count ?? listingsResult.data?.length ?? 0,
      reports: reportCount.count ?? reportsResult.data?.length ?? 0,
      trades: tradeCount.count ?? purchasesResult.data?.length ?? 0
    },
    users:
      usersResult.data?.map((user) => ({
        id: user.id,
        name: user.full_name ?? "Usuario",
        role: user.role,
        blocked: user.is_blocked,
        created: formatDate(user.created_at)
      })) ?? [],
    listings:
      listingsResult.data?.map((listing) => ({
        id: listing.id,
        title: listing.title,
        category: listing.category,
        status: listing.status
      })) ?? [],
    reports:
      reportsResult.data?.map((report) => ({
        id: report.id,
        reason: report.reason,
        status: report.status,
        created: formatDate(report.created_at)
      })) ?? [],
    trades:
      purchasesResult.data?.map((trade) => ({
        id: trade.id,
        status: trade.status,
        credits: `${trade.credits} credis`,
        created: formatDate(trade.created_at)
      })) ?? [],
    intakes,
    creditMovements:
      movementsResult.data?.map((movement) => ({
        id: movement.id,
        user: relatedName(movement.user, movement.user_id),
        amount: `${movement.amount} credis`,
        note: movement.note ?? "Movimiento de créditos",
        created: formatDate(movement.created_at)
      })) ?? []
  };
}

export async function getAdminIntake(id: string) {
  if (!isSupabaseConfigured()) {
    return {
      id,
      title: "Solicitud de ejemplo",
      category: "Electrónica",
      condition: "Bueno",
      description: "Solicitud privada enviada a Intercambio CR.",
      offered_credits: null as number | null,
      status: "submitted",
      inspection_notes: null as string | null,
      dropoff_location: "Escazú Centro o Alajuela Centro",
      userName: "Usuario",
      created: "Sin fecha",
      images: [] as string[]
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_intakes")
    .select("id,title,category,condition,description,offered_credits,status,inspection_notes,dropoff_location,created_at,user_id,user:profiles!platform_intakes_user_id_fkey(full_name),intake_images(storage_path,sort_order),intake_conversations(id)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return {
      id,
      title: "Solicitud no encontrada",
      category: "Sin categoría",
      condition: "Sin estado",
      description: "No se pudo cargar esta solicitud.",
      offered_credits: null as number | null,
      status: "unknown",
      inspection_notes: null as string | null,
      dropoff_location: "Escazú Centro o Alajuela Centro",
      userName: "Usuario",
      created: "Sin fecha",
      images: [] as string[],
      conversationId: null as string | null
    };
  }

  const storage = supabase.storage.from("intake-images");
  const paths = orderedStoragePaths(data.intake_images);
  const images = await signedIntakeImageUrls(storage, paths, {
    intakeId: data.id,
    source: "getAdminIntake"
  });

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    condition: data.condition,
    description: data.description,
    offered_credits: data.offered_credits,
    status: data.status,
    inspection_notes: data.inspection_notes,
    dropoff_location: data.dropoff_location,
    userName: relatedName(data.user),
    created: formatDate(data.created_at),
    images,
    conversationId: relatedConversationId(data.intake_conversations as RelatedConversation)
  };
}
