import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { submitListingReport } from "@/lib/actions/marketplace";

const safetyRules = [
  "Reúnete en lugares públicos, iluminados y con movimiento.",
  "Verifica el artículo antes de aceptar una oferta o confirmar entrega.",
  "No compartas claves, datos bancarios, tarjetas ni códigos de verificación.",
  "No aceptes presión para cerrar acuerdos fuera de la plataforma.",
  "Reporta publicaciones falsas, spam o comportamientos sospechosos."
];

export default async function SafetyPage({
  searchParams
}: {
  searchParams: Promise<{ listing?: string; ok?: string; error?: string }>;
}) {
  const { listing, ok, error } = await searchParams;

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-xs font-bold text-leaf-700">
            <ShieldCheck className="h-4 w-4" />
            Seguridad
          </div>
          <h1 className="text-3xl font-bold text-ink">Intercambia con cuidado</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            En acuerdos entre usuarios, Intercambio CR funciona como intermediario tecnológico.
            En entregas a Intercambio CR, la plataforma inspecciona y decide si acepta el artículo.
          </p>
        </div>

        {ok ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            Reporte enviado. Lo revisaremos desde el panel administrador.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo enviar el reporte: {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Avisos importantes</h2>
            <div className="mt-4 space-y-3">
              {safetyRules.map((rule) => (
                <div key={rule} className="flex gap-2 rounded-lg bg-slate-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                  <p className="text-sm leading-6 text-slate-600">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <form action={submitListingReport} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-ink">Enviar reporte</h2>
            </div>
            <input type="hidden" name="listing_id" value={listing ?? ""} />
            <label className="block text-sm font-medium text-slate-700">
              Motivo
              <select name="reason" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3">
                <option value="">Elige una opción</option>
                <option>Publicación falsa</option>
                <option>Intento de estafa</option>
                <option>Conducta inapropiada</option>
                <option>Spam</option>
                <option>Artículo prohibido</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Detalles
              <textarea
                name="details"
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3"
                placeholder="Cuéntanos qué pasó"
              />
            </label>
            <SubmitButton className="mt-4 h-11 w-full rounded-lg bg-amber-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
              Enviar reporte
            </SubmitButton>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
