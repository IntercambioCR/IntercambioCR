import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { resetPasswordForEmail } from "@/lib/auth/actions";

export default async function RecoverPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-xl place-items-center px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">Restaurar contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ingresa tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.
          </p>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              No se pudo enviar el enlace: {error}
            </div>
          ) : null}

          <form action={resetPasswordForEmail} className="mt-5 grid gap-3">
            <input
              name="email"
              required
              type="email"
              className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="correo@ejemplo.com"
            />
            <SubmitButton className="focus-ring h-12 rounded-lg bg-ocean-600 text-sm font-bold text-white hover:bg-ocean-500 disabled:cursor-wait disabled:opacity-70">
              Enviar enlace de recuperación
            </SubmitButton>
          </form>

          <Link
            href="/auth"
            className="mt-4 inline-flex text-sm font-bold text-ocean-700 underline underline-offset-4"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
