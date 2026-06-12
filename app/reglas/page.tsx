import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { forbiddenItems, trustRules } from "@/lib/constants";

const exchangeRules = [
  "Describe el artículo con fotos reales, estado actual, ubicación aproximada y detalles importantes.",
  "Puedes recibir ofertas en créditos, ofertas con otro artículo o propuestas mixtas.",
  "Acepta una oferta solo cuando tengas claro el estado del artículo, la forma de entrega y las condiciones del acuerdo.",
  "Si hay créditos retenidos, ambas partes deben confirmar antes de completar el movimiento.",
  "Intercambio CR puede revisar, pausar o remover publicaciones cuando detecte riesgo, fraude o incumplimiento."
];

export default function ExchangeRulesPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-xs font-bold text-leaf-700">
            <ShieldCheck className="h-4 w-4" />
            Reglas de intercambio
          </div>
          <h1 className="text-3xl font-bold text-ink">Reglas de intercambio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Estas reglas ayudan a que la comunidad intercambie, venda y compre con créditos de forma más clara y segura.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Cómo publicar y aceptar ofertas</h2>
            <div className="mt-4 space-y-3">
              {exchangeRules.map((rule) => (
                <div key={rule} className="flex gap-2 rounded-lg bg-slate-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                  <p className="text-sm leading-6 text-slate-600">{rule}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Reglas de confianza</h2>
            <div className="mt-4 space-y-3">
              {trustRules.map((rule) => (
                <div key={rule} className="flex gap-2 rounded-lg bg-ocean-50 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ocean-600" />
                  <p className="text-sm leading-6 text-slate-600">{rule}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-ink">Artículos no permitidos</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {forbiddenItems.map((item) => (
              <div key={item} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {item}
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
