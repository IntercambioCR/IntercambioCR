import { Bell } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NotificationCard } from "@/components/notification-card";
import { getUserNotifications } from "@/lib/data/notifications";

export default async function NotificationsPage() {
  const notifications = await getUserNotifications();

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <Bell className="h-4 w-4" />
            Notificaciones
          </div>
          <h1 className="text-3xl font-bold text-ink">Actividad reciente</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Aquí aparecerán entregas a Intercambio CR, ofertas, mensajes, reportes y movimientos importantes.
          </p>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
