import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function keyHint(value?: string) {
  if (!value) {
    return "sin-configurar";
  }

  return `${value.slice(0, 18)}...${value.slice(-6)}`;
}

function projectRefFromUrl(value?: string) {
  if (!value) {
    return "sin-configurar";
  }

  try {
    return new URL(value).hostname.split(".")[0] ?? "url-invalida";
  } catch {
    return "url-invalida";
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disponible solo en desarrollo." }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics = {
    serverUrl: supabaseUrl ?? "sin-configurar",
    serverProjectRef: projectRefFromUrl(supabaseUrl),
    serverAnonKeyHint: keyHint(anonKey),
    serverServiceKeyHint: keyHint(serviceRoleKey),
    canListAuthUsers: false,
    authUserCount: null as number | null,
    authListError: null as string | null
  };

  if (!supabaseUrl || !serviceRoleKey) {
    diagnostics.authListError = "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.";
    return NextResponse.json(diagnostics);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    diagnostics.authListError = error.message;
    return NextResponse.json(diagnostics);
  }

  diagnostics.canListAuthUsers = true;
  diagnostics.authUserCount = data.users.length;

  return NextResponse.json(diagnostics);
}
