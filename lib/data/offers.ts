import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type OfferSummary = {
  id: string;
  listingTitle: string;
  otherPerson: string;
  direction: "received" | "sent";
  type: string;
  credits: number;
  itemDescription: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type OfferRow = {
  id: string;
  offer_type: "credits" | "item" | "mixed";
  credits: number;
  offered_item_description: string | null;
  message: string | null;
  status: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  listings?: { title?: string } | null;
  sender?: { full_name?: string } | null;
  receiver?: { full_name?: string } | null;
};

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

  const { data, error } = await supabase
    .from("listing_offers")
    .select("id,offer_type,credits,offered_item_description,message,status,created_at,sender_id,receiver_id,listings(title),sender:profiles!listing_offers_sender_id_fkey(full_name),receiver:profiles!listing_offers_receiver_id_fkey(full_name)")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as OfferRow[]).map((offer) => {
    const direction = offer.receiver_id === user.id ? "received" : "sent";

    return {
      id: offer.id,
      listingTitle: offer.listings?.title ?? "Publicación",
      otherPerson:
        direction === "received"
          ? offer.sender?.full_name ?? "Persona interesada"
          : offer.receiver?.full_name ?? "Persona oferente",
      direction,
      type:
        offer.offer_type === "credits"
          ? "Créditos"
          : offer.offer_type === "item"
            ? "Artículo"
            : "Mixta",
      credits: offer.credits,
      itemDescription: offer.offered_item_description,
      message: offer.message,
      status: offer.status,
      createdAt: new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short"
      }).format(new Date(offer.created_at))
    };
  });
}
