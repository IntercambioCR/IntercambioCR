import {
  AlertTriangle,
  CheckCircle2,
  Handshake,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  acceptPurchase,
  cancelPurchase,
  confirmPurchase,
  disputePurchase
} from "@/lib/actions/credits";

export default async function PurchasePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <ShieldCheck className="h-4 w-4" />
            Oferta protegida
          </div>
          <h1 className="text-3xl font-bold text-ink">Oferta en proceso</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Esta pantalla conecta las acciones reales del backend: aceptar,
            confirmar, cancelar o disputar. Supabase valida si el usuario tiene
            permisos para cada acción.
          </p>
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Flujo protegido</h2>
            <div className="mt-4 space-y-3">
              {[
                "La persona interesada puede ofrecer créditos o proponer otro artículo.",
                "La persona que publicó acepta la oferta que más le convenga.",
                "Ambas partes coordinan y confirman la entrega.",
                "Si hubo créditos, el sistema los libera cuando ambas confirmaciones existen."
              ].map((step) => (
                <div key={step} className="flex gap-2 rounded-lg bg-slate-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                  <p className="text-sm leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Acciones</h2>
            <div className="mt-4 grid gap-3">
              <form action={acceptPurchase}>
                <input type="hidden" name="purchase_id" value={id} />
                <button className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 px-3 text-sm font-bold text-white hover:bg-ocean-500">
                  <Handshake className="h-4 w-4" />
                  Aceptar oferta
                </button>
              </form>
              <form action={confirmPurchase}>
                <input type="hidden" name="purchase_id" value={id} />
                <button className="focus-ring min-h-12 w-full rounded-lg bg-leaf-600 px-3 text-sm font-bold text-white hover:bg-leaf-500">
                  Confirmar entrega
                </button>
              </form>
              <form action={cancelPurchase}>
                <input type="hidden" name="purchase_id" value={id} />
                <input type="hidden" name="note" value="Cancelada desde la vista de intercambio" />
                <button className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-ink hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" />
                  Cancelar
                </button>
              </form>
              <form action={disputePurchase} className="grid gap-2">
                <input type="hidden" name="purchase_id" value={id} />
                <textarea
                  name="reason"
                  required
                  className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm"
                  placeholder="Motivo de la disputa"
                />
                <button className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-sm font-bold text-red-600 hover:bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  Abrir disputa
                </button>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
