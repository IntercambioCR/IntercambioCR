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

async function fetchPublicListings(supabase: Awaited<ReturnType<typeof createClient>>, limit = 24) {
  const select =
    "id,title,category,condition,location,credit_price,looking_for,description,listing_images(storage_path,sort_order)";
  const { data: available, error: availableError } = await supabase
    .from("listings")
    .select(select)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (availableError) {
    console.error("[Intercambio CR fetch available listings]", availableError);
    return [];
  }

  const { data: approved, error: approvedError } = await supabase
    .from("listings")
    .select(select)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (approvedError) {
    return (available ?? []) as ListingRow[];
  }

  const rows = [...((available ?? []) as ListingRow[]), ...((approved ?? []) as ListingRow[])];
  return Array.from(new Map(rows.map((listing) => [listing.id, listing])).values()).slice(0, limit);
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
  const select =
    "id,title,category,condition,location,credit_price,looking_for,description,seller_id,listing_images(storage_path,sort_order)";
  let { data, error } = await supabase
    .from("listings")
    .select(select)
    .eq("id", id)
    .eq("status", "available")
    .single();

  if (error || !data) {
    const approvedResult = await supabase
      .from("listings")
      .select(select)
      .eq("id", id)
      .eq("status", "approved")
      .single();

    data = approvedResult.data;
    error = approvedResult.error;
  }

  if (error || !data) {
    return null;
  }

  return mapListingSummary(supabase, data as ListingRow);
}
