export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseConfigError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
      return "La URL de Supabase no parece válida. Revisa NEXT_PUBLIC_SUPABASE_URL en .env.local.";
    }
  } catch {
    return "La URL de Supabase no tiene un formato válido. Revisa NEXT_PUBLIC_SUPABASE_URL en .env.local.";
  }

  return null;
}

export function getSupabasePublicInfo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let projectRef = "sin-configurar";

  try {
    projectRef = new URL(url).hostname.split(".")[0] ?? projectRef;
  } catch {
    projectRef = "url-invalida";
  }

  return {
    url,
    projectRef,
    anonKeyHint: anonKey ? `${anonKey.slice(0, 13)}...${anonKey.slice(-4)}` : "sin-configurar"
  };
}
