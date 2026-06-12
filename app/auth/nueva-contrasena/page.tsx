import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { updatePassword } from "@/lib/auth/actions";

export default async function NewPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <form action={updatePassword} className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <KeyRound className="h-9 w-9 text-ocean-600" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Crear nueva contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usa una contraseña de al menos 8 caracteres.
          </p>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              No se pudo actualizar la contraseña: {error}
            </div>
          ) : null}
          <input
            name="password"
            required
            minLength={8}
            type="password"
            className="mt-5 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Nueva contraseña"
          />
          <button className="focus-ring mt-4 h-12 w-full rounded-lg bg-ocean-600 text-sm font-bold text-white hover:bg-ocean-500">
            Guardar contraseña
          </button>
        </form>
      </section>
    </AppShell>
  );
}
