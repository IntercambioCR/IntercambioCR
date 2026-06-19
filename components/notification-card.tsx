"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { UserNotification } from "@/lib/data/notifications";

export function NotificationCard({ notification }: { notification: UserNotification }) {
  function markAsRead() {
    console.log("Notification click target:", notification.href);

    if (notification.id.includes("-help")) {
      return;
    }

    void fetch("/api/notificaciones/leer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ notificationId: notification.id }),
      keepalive: true
    }).catch((error) => {
      console.error("Mark notification read error:", error);
    });
  }

  return (
    <Link
      href={notification.href}
      onClick={markAsRead}
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
    </Link>
  );
}
