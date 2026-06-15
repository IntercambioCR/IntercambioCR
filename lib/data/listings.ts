import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ListingSummary = {
  id: string;
  title: string;
  category: string;
  condition: string;
  location: string;
  credits: number | null;
  looking_for?: string | null;
  image: string;
  images?: string[];
  description?: string;
  seller_id?: string;
};

const fallbackImage =
  "/demo/hero-intercambio-real.png";

type ListingRow = {
  id: string;
  title: string;
  category: string;
  condition: string;
  location: string;
  credit_price: number | null;
  looking_for: string | null;
  description: string;
  seller_id?: string;
  listing_images?: Array<{ storage_path: string; sort_order: number }> | null;
};

const publicListingSelect =
  "id,title,category,condition,location,credit_price,looking_for,description,listing_images(storage_path,sort_order)";
const publicListingSelectWithoutLookingFor =
  "id,title,category,condition,location,credit_price,description,listing_images(storage_path,sort_order)";

function isMissingLookingForError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    String((error as { message?: unknown }).message).toLowerCase().includes("looking_for")
  );
}

async function fetchPublicListings(supabase: Awaited<ReturnType<typeof createClient>>, limit = 24) {
  const { data: available, error: availableError } = await supabase
    .from("listings")
    .select(publicListingSelect)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (availableError && isMissingLookingForError(availableError)) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("listings")
      .select(publicListingSelectWithoutLookingFor)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallbackError) {
      console.error("[Intercambio CR fetch available listings fallback]", fallbackError);
      return [];
    }

    return ((fallback ?? []) as ListingRow[]).map((listing) => ({ ...listing, looking_for: null }));
  }

  if (availableError) {
    console.error("[Intercambio CR fetch available listings]", availableError);
    return [];
  }

  return (available ?? []) as ListingRow[];
}

function mapListingSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listing: ListingRow
): ListingSummary {
  const imagePaths = listing.listing_images
    ?.sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => item.storage_path) ?? [];
  const images = imagePaths.map(
    (path) => supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl
  );
  const image = images[0] ?? fallbackImage;

  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    condition: listing.condition,
    location: listing.location,
    credits: listing.credit_price,
    looking_for: listing.looking_for,
    image,
    images: images.length > 0 ? images : [fallbackImage],
    description: listing.description,
    seller_id: listing.seller_id
  };
}

export async function getListings() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const data = await fetchPublicListings(supabase);
  return data.map((listing) => mapListingSummary(supabase, listing));
}

export async function getListing(id: string): Promise<ListingSummary | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  let { data, error } = await supabase
    .from("listings")
    .select(`${publicListingSelect},seller_id`)
    .eq("id", id)
    .eq("status", "available")
    .single();

  if (error && isMissingLookingForError(error)) {
    const fallbackResult = await supabase
      .from("listings")
      .select(`${publicListingSelectWithoutLookingFor},seller_id`)
      .eq("id", id)
      .eq("status", "available")
      .single();

    data = fallbackResult.data ? ({ ...fallbackResult.data, looking_for: null } as typeof data) : null;
    error = fallbackResult.error;
  }

  if (error || !data) {
    return null;
  }

  return mapListingSummary(supabase, data as ListingRow);
}
