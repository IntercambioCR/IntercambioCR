import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type UserNotification = {
  id: string;
  title: string;
  body: string;
  created: string;
  read: boolean;
};

const fallbackNotifications: UserNotification[] = [
  {
    id: "intake-help",
    title: "Entregas privadas",
    body: "Tu entrega a Intercambio CR quedará pendiente hasta que se revise el artículo.",
    created: "Próximamente",
    read: false
  },
  {
    id: "offers-help",
    title: "Ofertas",
    body: "Cuando alguien haga una oferta por un artículo tuyo, la verás en esta pantalla.",
    created: "Próximamente",
    read: false
  },
  {
    id: "credits-help",
    title: "Credis",
    body: "Los movimientos importantes también aparecerán en tu billetera.",
    created: "Próximamente",
    read: false
  }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export async function getUserNotifications(): Promise<UserNotification[]> {
  if (!isSupabaseConfigured()) {
    return fallbackNotifications;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fallbackNotifications;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return fallbackNotifications;
  }

  return data.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    created: formatDate(notification.created_at),
    read: Boolean(notification.read_at)
  }));
}

export async function getUnreadActivityCount() {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count: offerCount, error: offerError } = await supabase
    .from("listing_offers")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("status", "submitted");

  if (offerError) {
    console.error("Load received offers error:", {
      message: offerError.message,
      code: offerError.code,
      details: offerError.details,
      hint: offerError.hint,
      error: offerError
    });
  }

  const { data: conversations, error: conversationError } = await supabase
    .from("direct_conversations")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

  if (conversationError) {
    console.error("Load inbox error:", {
      message: conversationError.message,
      code: conversationError.code,
      details: conversationError.details,
      hint: conversationError.hint,
      error: conversationError
    });
    return offerCount ?? 0;
  }

  const conversationIds = conversations?.map((conversation) => conversation.id) ?? [];
  if (conversationIds.length === 0) {
    return offerCount ?? 0;
  }

  const { count: messageCount, error: messageError } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (messageError) {
    console.error("Load inbox error:", {
      message: messageError.message,
      code: messageError.code,
      details: messageError.details,
      hint: messageError.hint,
      error: messageError
    });
  }

  return (offerCount ?? 0) + (messageCount ?? 0);
}
