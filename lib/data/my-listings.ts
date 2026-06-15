import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type MyListing = {
  id: string;
  title: string;
  category: string;
  status: string;
  credits: number | null;
  looking_for: string | null;
};

export async function getMyListings(): Promise<MyListing[]> {
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

  let { data, error } = await supabase
    .from("listings")
    .select("id,title,category,status,credit_price,looking_for")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (
    error &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("looking_for")
  ) {
    const fallback = await supabase
      .from("listings")
      .select("id,title,category,status,credit_price")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    data = fallback.data ? fallback.data.map((listing) => ({ ...listing, looking_for: null })) : null;
    error = fallback.error;
  }

  if (error || !data) {
    return [];
  }

  return data.map((listing) => ({
    id: listing.id,
    title: listing.title,
    category: listing.category,
    status: listing.status,
    credits: listing.credit_price,
    looking_for: listing.looking_for
  }));
}
