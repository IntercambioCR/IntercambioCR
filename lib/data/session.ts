import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  role: "user" | "admin";
  full_name: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  rating: number;
  completed_trades: number;
};

async function withTimeout<T>(promise: PromiseLike<T>, ms = 3000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("supabase_timeout")), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function logProfileLoadError(error: unknown, context: Record<string, unknown>) {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  console.error("Profile load error:", {
    message: typeof record?.message === "string" ? record.message : String(error),
    code: record?.code ?? null,
    details: record?.details ?? null,
    hint: record?.hint ?? null,
    error,
    ...context
  });
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { session }
    } = await withTimeout(supabase.auth.getSession(), 1500);

    if (!session?.user) {
      return null;
    }

    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("id,role,full_name,avatar_url,location,bio,rating,completed_trades")
        .eq("id", session.user.id)
        .single(),
      3000
    );

    if (error) {
      logProfileLoadError(error, {
        table: "profiles",
        userId: session.user.id,
        action: "getCurrentProfile.select"
      });
    }

    if (!data) {
      const fullName =
        typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : session.user.email ?? "Usuario Intercambio";
      const { data: createdProfile, error: createError } = await withTimeout(
        supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: fullName
          })
          .select("id,role,full_name,avatar_url,location,bio,rating,completed_trades")
          .single(),
        3000
      );

      if (createError || !createdProfile) {
        logProfileLoadError(createError ?? new Error("profile_create_returned_no_data"), {
          table: "profiles",
          userId: session.user.id,
          action: "getCurrentProfile.insert"
        });
        return null;
      }

      return createdProfile as CurrentProfile;
    }

    return data as CurrentProfile;
  } catch {
    return null;
  }
}

export async function isCurrentUserAdmin() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = await createClient();
    const {
      data: { session }
    } = await withTimeout(supabase.auth.getSession(), 1500);

    if (!session?.user) {
      return false;
    }

    const { data, error } = await withTimeout(supabase.rpc("is_admin"), 3000);
    return !error && data === true;
  } catch {
    return false;
  }
}
