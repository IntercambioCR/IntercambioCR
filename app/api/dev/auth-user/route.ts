import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disponible solo en desarrollo." }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    userId?: string | null;
  };
  const email = body.email?.trim().toLowerCase();
  const userId = body.userId?.trim();

  if (!email && !userId) {
    return NextResponse.json({ error: "Envía email o userId." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  if (userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      return NextResponse.json({ exists: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({
      exists: Boolean(data.user),
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      confirmedAt: data.user?.email_confirmed_at ?? data.user?.confirmed_at ?? null
    });
  }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 200 });
  }

  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;

  return NextResponse.json({
    exists: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    confirmedAt: user?.email_confirmed_at ?? user?.confirmed_at ?? null
  });
}
