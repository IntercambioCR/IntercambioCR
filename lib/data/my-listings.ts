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

  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,status,credit_price,looking_for")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

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
