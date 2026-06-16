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

type ListingRow = {
  id: string;
  title: string;
  category: string;
  condition: string;
  location: string;
  credit_price: number | null;
  description: string;
  seller_id?: string;
};

type ListingImageRow = {
  listing_id: string;
  storage_path: string;
  sort_order: number | null;
};

const fallbackImage = "/demo/hero-intercambio-real.png";

const publicListingSelect =
  "id,title,category,condition,location,credit_price,description,seller_id";

async function getPublicListingImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingIds: string[]
) {
  if (listingIds.length === 0) {
    return new Map<string, string[]>();
  }

  const { data, error } = await supabase
    .from("listing_images")
    .select("listing_id,storage_path,sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[Intercambio CR listing images query]", {
      listingIds,
      message: error?.message,
      details: error
    });
    return new Map<string, string[]>();
  }

  const grouped = new Map<string, string[]>();
  for (const image of data as ListingImageRow[]) {
    const publicUrl = supabase.storage.from("listing-images").getPublicUrl(image.storage_path).data.publicUrl;
    grouped.set(image.listing_id, [...(grouped.get(image.listing_id) ?? []), publicUrl]);
  }

  return grouped;
}

function mapListingSummary(listing: ListingRow, images: string[]): ListingSummary {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    condition: listing.condition,
    location: listing.location,
    credits: listing.credit_price,
    looking_for: null,
    image: images[0] ?? fallbackImage,
    images: images.length > 0 ? images : [fallbackImage],
    description: listing.description,
    seller_id: listing.seller_id
  };
}

export async function getListings() {
  if (!isSupabaseConfigured()) {
    console.warn("[Intercambio CR public listings query skipped]", {
      reason: "Supabase no está configurado"
    });
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(publicListingSelect)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !data) {
    console.error("[Intercambio CR public listings query]", {
      table: "listings",
      filter: "status=available",
      select: publicListingSelect,
      message: error?.message,
      details: error
    });
    return [];
  }

  const listings = data as ListingRow[];
  console.info("[Intercambio CR public listings query success]", {
    table: "listings",
    filter: "status=available",
    count: listings.length,
    ids: listings.map((listing) => listing.id)
  });

  const imagesByListing = await getPublicListingImages(
    supabase,
    listings.map((listing) => listing.id)
  );

  return listings.map((listing) => mapListingSummary(listing, imagesByListing.get(listing.id) ?? []));
}

export async function getListing(id: string): Promise<ListingSummary | null> {
  if (!isSupabaseConfigured()) {
    console.warn("[Intercambio CR public listing detail query skipped]", {
      reason: "Supabase no está configurado",
      id
    });
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(publicListingSelect)
    .eq("id", id)
    .eq("status", "available")
    .single();

  if (error || !data) {
    console.error("[Intercambio CR public listing detail query]", {
      table: "listings",
      id,
      filter: "status=available",
      select: publicListingSelect,
      message: error?.message,
      details: error
    });
    return null;
  }

  const imagesByListing = await getPublicListingImages(supabase, [id]);
  console.info("[Intercambio CR public listing detail query success]", {
    table: "listings",
    id,
    filter: "status=available"
  });

  return mapListingSummary(data as ListingRow, imagesByListing.get(id) ?? []);
}
