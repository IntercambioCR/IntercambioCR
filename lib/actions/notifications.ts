"use server";

import { redirect } from "next/navigation";
import { validateUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";

function safeHref(value: FormDataEntryValue | null) {
  const href = typeof value === "string" ? value : "/notificaciones";
  return href.startsWith("/") && !href.startsWith("//") ? href : "/notificaciones";
}

export async function openNotification(formData: FormData) {
  const notificationId = String(formData.get("notification_id") ?? "");
  const href = safeHref(formData.get("href"));

  try {
    validateUuid(notificationId, "Notificación");
  } catch {
    redirect(href);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirect=${encodeURIComponent(href)}`);
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Mark notification read error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error,
      notificationId,
      userId: user.id
    });
  }

  redirect(href);
}
