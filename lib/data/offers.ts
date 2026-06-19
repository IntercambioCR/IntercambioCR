import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCostaRicaShortDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type OfferSummary = {
  id: string;
  listingId: string;
  listingTitle: string;
  otherPerson: string;
  otherUserId: string;
  direction: "received" | "sent";
  type: string;
  credits: number;
  itemDescription: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  createdAtRaw: string;
  hasRated: boolean;
};

type OfferRow = {
  id: string;
  listing_id: string;
  offer_type: "credits" | "item" | "mixed";
  credits: number;
  offered_item_description: string | null;
  message: string | null;
  status: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

function logOfferLoadError(label: string, error: unknown, context: Record<string, unknown>) {
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

function logOfferLoadResult(label: string, offers: OfferRow[] | null | undefined, context: Record<string, unknown>) {
  console.log(label, {
    count: offers?.length ?? 0,
    statuses:
      offers?.map((offer) => ({
        id: offer.id,
        status: offer.status,
        sender_id: offer.sender_id,
        receiver_id: offer.receiver_id
      })) ?? [],
    ...context
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function loadProfileMap(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("profiles").select("id,full_name").in("id", ids);

  if (error) {
    logOfferLoadError("Load received offers error:", error, {
      table: "profiles",
      action: "loadOfferParticipants",
      ids
    });
    logOfferLoadError("Load sent offers error:", error, {
      table: "profiles",
      action: "loadOfferParticipants",
      ids
    });
    return new Map<string, string>();
  }

  return new Map((data as ProfileRow[] | null)?.map((profile) => [profile.id, profile.full_name ?? "Usuario"]) ?? []);
}

async function loadListingMap(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("listings").select("id,title").in("id", ids);

  if (error) {
    logOfferLoadError("Load received offers error:", error, {
      table: "listings",
      action: "loadOfferListings",
      ids
    });
    logOfferLoadError("Load sent offers error:", error, {
      table: "listings",
      action: "loadOfferListings",
      ids
    });
    return new Map<string, string>();
  }

  return new Map((data as ListingRow[] | null)?.map((listing) => [listing.id, listing.title ?? "Publicación"]) ?? []);
}

async function loadRatedOfferIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, offerIds: string[]) {
  if (offerIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("user_ratings")
    .select("offer_id")
    .eq("reviewer_id", userId)
    .in("offer_id", offerIds);

  if (error) {
    logOfferLoadError("Load sent offers error:", error, {
      table: "user_ratings",
      action: "loadRatedOfferIds",
      userId
    });
    return new Set<string>();
  }

  return new Set((data as Array<{ offer_id: string }> | null)?.map((rating) => rating.offer_id) ?? []);
}

function mapOffer(
  offer: OfferRow,
  direction: "received" | "sent",
  profileMap: Map<string, string>,
  listingMap: Map<string, string>,
  ratedOfferIds: Set<string>
): OfferSummary {
  const otherUserId = direction === "received" ? offer.sender_id : offer.receiver_id;

  return {
    id: offer.id,
    listingId: offer.listing_id,
    listingTitle: listingMap.get(offer.listing_id) ?? "Publicación",
    otherPerson: profileMap.get(otherUserId) ?? (direction === "received" ? "Persona interesada" : "Persona oferente"),
    otherUserId,
    direction,
    type: offer.offer_type === "credits" ? "Créditos" : offer.offer_type === "item" ? "Artículo" : "Mixta",
    credits: offer.credits,
    itemDescription: offer.offered_item_description,
    message: offer.message,
    status: offer.status,
    createdAt: formatCostaRicaShortDate(offer.created_at),
    createdAtRaw: offer.created_at,
    hasRated: ratedOfferIds.has(offer.id)
  };
}

export async function getOffers(): Promise<OfferSummary[]> {
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

  const { data: receivedData, error: receivedError } = await supabase
    .from("listing_offers")
    .select("id,listing_id,offer_type,credits,offered_item_description,message,status,created_at,sender_id,receiver_id")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false });

  if (receivedError) {
    logOfferLoadError("Load received offers error:", receivedError, {
      table: "listing_offers",
      userId: user.id,
      filter: "receiver_id"
    });
  }

  logOfferLoadResult("Load received offers result:", receivedData as OfferRow[] | null, {
    table: "listing_offers",
    userId: user.id,
    filter: "receiver_id"
  });

  const { data: sentData, error: sentError } = await supabase
    .from("listing_offers")
    .select("id,listing_id,offer_type,credits,offered_item_description,message,status,created_at,sender_id,receiver_id")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  if (sentError) {
    logOfferLoadError("Load sent offers error:", sentError, {
      table: "listing_offers",
      userId: user.id,
      filter: "sender_id"
    });
  }

  logOfferLoadResult("Load sent offers result:", sentData as OfferRow[] | null, {
    table: "listing_offers",
    userId: user.id,
    filter: "sender_id"
  });

  const receivedRows = (receivedData as OfferRow[] | null) ?? [];
  const sentRows = (sentData as OfferRow[] | null) ?? [];
  const allRows = [...receivedRows, ...sentRows];
  const profileMap = await loadProfileMap(supabase, unique(allRows.flatMap((offer) => [offer.sender_id, offer.receiver_id])));
  const listingMap = await loadListingMap(supabase, unique(allRows.map((offer) => offer.listing_id)));
  const ratedOfferIds = await loadRatedOfferIds(
    supabase,
    user.id,
    allRows.filter((offer) => offer.status === "completed").map((offer) => offer.id)
  );

  const receivedOffers = receivedRows.map((offer) => mapOffer(offer, "received", profileMap, listingMap, ratedOfferIds));
  const sentOffers = sentRows.map((offer) => mapOffer(offer, "sent", profileMap, listingMap, ratedOfferIds));

  return [...receivedOffers, ...sentOffers].sort(
    (a, b) => new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime()
  );
}
