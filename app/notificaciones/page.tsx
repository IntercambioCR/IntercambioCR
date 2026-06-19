import { Bell, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { openNotification } from "@/lib/actions/notifications";
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
            <form key={notification.id} action={openNotification}>
              <input type="hidden" name="notification_id" value={notification.id} />
              <input type="hidden" name="href" value={notification.href} />
              <button
                type="submit"
                className="flex w-full gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-ocean-200 hover:bg-ocean-50/40"
              >
                <span className="relative mt-0.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf-600" />
                  {!notification.read ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                  ) : null}
                </span>
                <span>
                  <span className="block font-bold text-ink">{notification.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.body}</span>
                  <span className="mt-2 block text-xs font-semibold text-slate-400">{notification.created}</span>
                </span>
              </button>
            </form>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
