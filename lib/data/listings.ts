import { demoListings } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ListingSummary = {
  id: string;
  title: string;
  category: string;
  condition: string;
  location: string;
  credits: number;
  image: string;
  images?: string[];
  description?: string;
  seller_id?: string;
};

const fallbackImage =
  "/demo/hero-intercambio-real.png";

export async function getListings() {
  if (!isSupabaseConfigured()) {
    return demoListings;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,condition,location,credit_price,description,listing_images(storage_path,sort_order)")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !data) {
    return demoListings;
  }

  return data.map((listing): ListingSummary => {
    const imagePaths = listing.listing_images
      ?.sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    )
      .map((item: { storage_path: string }) => item.storage_path) ?? [];
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
      image,
      images: images.length > 0 ? images : [fallbackImage],
      description: listing.description
    };
  });
}

export async function getListing(id: string) {
  if (!isSupabaseConfigured()) {
    return demoListings.find((item) => item.id === id) ?? demoListings[0];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,condition,location,credit_price,description,seller_id,listing_images(storage_path,sort_order)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return demoListings.find((item) => item.id === id) ?? demoListings[0];
  }

  const imagePaths = data.listing_images
    ?.sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )
    .map((item: { storage_path: string }) => item.storage_path) ?? [];
  const images = imagePaths.map(
    (path) => supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl
  );

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    condition: data.condition,
    location: data.location,
    credits: data.credit_price,
    image: images[0] ?? fallbackImage,
    images: images.length > 0 ? images : [fallbackImage],
    description: data.description,
    seller_id: data.seller_id
  };
}
