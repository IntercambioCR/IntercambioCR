import { NextResponse } from "next/server";
import { isUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { notificationId?: unknown };
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : "";

    if (!isUuid(notificationId)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
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
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
