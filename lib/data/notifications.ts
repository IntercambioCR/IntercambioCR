import { formatCostaRicaRelativeDate } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type UserNotification = {
  id: string;
  type?: string | null;
  title: string;
  body: string;
  created: string;
  read: boolean;
  href: string;
};

type NotificationRow = {
  id: string;
  type?: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  related_offer_id?: string | null;
  related_message_id?: string | null;
  related_conversation_id?: string | null;
  related_listing_id?: string | null;
  related_intake_id?: string | null;
};

const fallbackNotifications: UserNotification[] = [
  {
    id: "intake-help",
    title: "Entregas privadas",
    body: "Tu entrega a Intercambio CR quedará pendiente hasta que se revise el artículo.",
    created: "Próximamente",
    read: false,
    href: "/perfil"
  },
  {
    id: "offers-help",
    title: "Ofertas",
    body: "Cuando alguien haga una oferta por un artículo tuyo, la verás en esta pantalla.",
    created: "Próximamente",
    read: false,
    href: "/ofertas"
  },
  {
    id: "credits-help",
    title: "Credis",
    body: "Los movimientos importantes también aparecerán en tu billetera.",
    created: "Próximamente",
    read: false,
    href: "/billetera"
  }
];

function notificationHref(notification: NotificationRow) {
  if (notification.related_conversation_id) {
    return `/mensajes/${notification.related_conversation_id}`;
  }

  if (notification.related_offer_id) {
    return `/ofertas?offer=${notification.related_offer_id}`;
  }

  if (notification.related_intake_id) {
    return `/perfil?tab=entregas&intake=${notification.related_intake_id}`;
  }

  if (notification.related_listing_id) {
    return `/articulos/${notification.related_listing_id}`;
  }

  if (notification.related_message_id) {
    return "/mensajes";
  }

  if (notification.type?.includes("offer")) {
    return "/ofertas";
  }

  if (notification.type?.includes("message")) {
    return "/mensajes";
  }

  if (notification.type?.includes("intake")) {
    return "/perfil?tab=entregas";
  }

  return "/notificaciones";
}

function logNotificationError(label: string, error: unknown, context: Record<string, unknown>) {
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
    .select(
      "id,type,title,body,read_at,created_at,related_offer_id,related_message_id,related_conversation_id,related_listing_id,related_intake_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    if (error) {
      logNotificationError("Load notifications error:", error, {
        table: "notifications",
        userId: user.id
      });
    }
    return fallbackNotifications;
  }

  return (data as NotificationRow[]).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    created: formatCostaRicaRelativeDate(notification.created_at),
    read: Boolean(notification.read_at),
    href: notificationHref(notification)
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

  const { count: notificationCount, error: notificationError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (notificationError) {
    logNotificationError("Load notifications error:", notificationError, {
      table: "notifications",
      userId: user.id,
      action: "countUnread"
    });
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
    return (notificationCount ?? 0) + (offerCount ?? 0);
  }

  const conversationIds = conversations?.map((conversation) => conversation.id) ?? [];
  if (conversationIds.length === 0) {
    return (notificationCount ?? 0) + (offerCount ?? 0);
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

  return (notificationCount ?? 0) + (offerCount ?? 0) + (messageCount ?? 0);
}
