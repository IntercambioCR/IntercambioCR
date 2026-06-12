import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function serializeAuthError(value: unknown) {
  if (value instanceof Error) {
    return Object.fromEntries(
      Object.getOwnPropertyNames(value).map((property) => [
        property,
        value[property as keyof Error]
      ])
    );
  }

  return value;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Ruta no disponible." }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        data: null,
        error: "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local."
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 10
  });

  if (error) {
    return NextResponse.json({
      data: null,
      error: serializeAuthError(error)
    });
  }

  return NextResponse.json({
    data: {
      count: data.users.length,
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        confirmed_at: user.confirmed_at,
        email_confirmed_at: user.email_confirmed_at,
        identities: user.identities
      }))
    },
    error: null
  });
}
