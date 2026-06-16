import { Ban, Camera, FileCheck2, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { categories, conditions, forbiddenItems } from "@/lib/constants";
import { submitPlatformIntake } from "@/lib/actions/credits";
import { SubmitButton } from "@/components/submit-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function getIntakeUser() {
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
    console.error("No se pudo verificar la sesión para entregar.", error);
    return null;
  }
}

export default async function IntakePage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const user = await getIntakeUser();

  if (!user) {
    redirect("/auth?redirect=/entregar&error=Inicia%20sesi%C3%B3n%20para%20entregar%20un%20art%C3%ADculo.");
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <FileCheck2 className="h-4 w-4" />
            Solicitud privada
          </div>
          <h1 className="text-3xl font-bold text-ink">Entregar a Intercambio CR</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Envía los datos del artículo para revisión interna. Esto no crea una publicación pública y no aparece en Inicio,
            Explorar, categorías, búsquedas ni perfil público. Intercambio CR revisa la solicitud, puede pedir más información,
            aprobarla, rechazarla o asignar una oferta en créditos después de inspección.
          </p>
        </div>

        {ok ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            Tu entrega fue registrada correctamente y será revisada por Intercambio CR.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo enviar la solicitud: {error}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form action={submitPlatformIntake} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Título
                <input name="title" required className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3" />
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
              <label className="text-sm font-medium text-slate-700">
                Marca, modelo o notas
                <input name="requested_notes" className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3" />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Descripción y detalles relevantes
              <textarea name="description" required className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 p-3" />
            </label>

            <div className="mt-4 rounded-lg border border-dashed border-ocean-200 bg-ocean-50 p-5 text-center">
              <Camera className="mx-auto h-8 w-8 text-ocean-600" />
              <p className="mt-2 text-sm font-semibold text-ink">Fotos para revisión</p>
              <p className="mt-1 text-xs text-slate-600">
                Sube frente, lados, etiqueta, defectos y prueba de funcionamiento si aplica.
                Formatos permitidos: JPG, PNG o WebP. Máximo 8 MB por imagen y hasta 6 fotos.
              </p>
              <input
                name="images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="mt-4 w-full rounded-lg border border-ocean-100 bg-white p-2 text-sm"
              />
            </div>

            <SubmitButton
              pendingLabel="Enviando solicitud..."
              className="focus-ring mt-5 h-12 w-full rounded-lg bg-ocean-600 text-sm font-bold text-white hover:bg-ocean-500 disabled:cursor-wait disabled:opacity-70"
            >
              Enviar solicitud privada
            </SubmitButton>
          </form>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex gap-2">
                <MapPin className="h-5 w-5 text-leaf-600" />
                <div>
                  <h2 className="font-bold text-ink">Entrega e inspección</h2>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    <p>Entrega e inspección presencial:</p>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Escazú Centro</li>
                      <li>Alajuela Centro</li>
                    </ul>
                    <p className="mt-2">Los créditos se emiten solo después de aprobación administrativa.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex gap-2">
                <Ban className="h-5 w-5 text-ocean-600" />
                <h2 className="font-bold text-ink">No aceptamos</h2>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {forbiddenItems.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
