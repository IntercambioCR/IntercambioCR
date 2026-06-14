import { Camera, Info } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { categories, conditions } from "@/lib/constants";
import { publishListing } from "@/lib/actions/credits";
import { SubmitButton } from "@/components/submit-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function getPublishUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    console.error("No se pudo verificar la sesión para publicar.", error);
    return null;
  }
}

export default async function PublishPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const user = await getPublishUser();

  if (!user) {
    redirect("/auth?next=/publicar&error=Inicia%20sesi%C3%B3n%20para%20publicar%20un%20art%C3%ADculo.");
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Publicar un artículo para la comunidad</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Publica un artículo para recibir ofertas en créditos o propuestas de intercambio.
            Puedes aceptar créditos, aceptar otro artículo o elegir la mejor oferta recibida.
          </p>
        </div>
        {ok ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            Artículo publicado correctamente. Ya puede aparecer en la comunidad cuando esté disponible.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo publicar el artículo: {error}
          </div>
        ) : null}
        <form action={publishListing} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Título
              <input name="title" required className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Valor sugerido en créditos
              <input
                name="credit_price"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3"
                placeholder="Ej. 250"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Escribe un número entero desde 1 crédito. No uses puntos ni decimales.
              </span>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Categoría
              <select name="category" className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3">
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Estado
              <select name="condition" className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3">
                {conditions.map((condition) => (
                  <option key={condition}>{condition}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Ubicación
            <input name="location" required className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Descripción
            <textarea name="description" required className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 p-3" />
          </label>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <Camera className="mx-auto h-8 w-8 text-ocean-600" />
            <p className="mt-2 text-sm font-semibold text-ink">Subir fotos</p>
            <input
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-4 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
            />
          </div>
          <div className="mt-4 flex gap-2 rounded-lg bg-leaf-50 p-3 text-sm text-leaf-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>No se podrá cambiar el valor ni las fotos después de aceptar una oferta.</p>
          </div>
          <SubmitButton
            pendingLabel="Publicando artículo..."
            className="focus-ring mt-5 h-12 w-full rounded-lg bg-leaf-600 text-sm font-bold text-white hover:bg-leaf-500 disabled:cursor-wait disabled:opacity-70"
          >
            Publicar artículo
          </SubmitButton>
        </form>
      </section>
    </AppShell>
  );
}
