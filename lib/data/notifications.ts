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
