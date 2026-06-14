import { AppShell } from "@/components/app-shell";
import { AuthForms } from "@/components/auth/auth-forms";
import { getSupabaseConfigError } from "@/lib/supabase/config";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string; next?: string; redirect?: string }>;
}) {
  const { error, ok, next, redirect } = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <AuthForms
          configError={getSupabaseConfigError()}
          initialError={error}
          initialOk={ok}
          nextPath={redirect ?? next}
        />
      </section>
    </AppShell>
  );
}
