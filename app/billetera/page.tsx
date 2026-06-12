import { LockKeyhole, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CreditLedger } from "@/components/credit-ledger";
import { getWalletData } from "@/lib/data/wallet";

export default async function WalletPage() {
  const { balances, movements } = await getWalletData();

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-ink">Billetera de créditos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Los créditos son saldo interno de Intercambio CR. No son dinero,
              no se redimen por efectivo y se pueden aceptar como una oferta dentro de la comunidad.
            </p>
          </div>
          <span className="hidden rounded-lg bg-ocean-600 p-3 text-white sm:grid">
            <WalletCards className="h-6 w-6" />
          </span>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map(([label, value, helper]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{helper}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <CreditLedger rows={movements} />
          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex gap-2">
              <LockKeyhole className="h-5 w-5 text-ocean-600" />
              <h2 className="font-bold text-ink">Controles activos</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Movimientos solo mediante publicaciones.</li>
              <li>Ofertas con créditos retenidos.</li>
              <li>Ajustes administrativos auditados.</li>
              <li>Congelamiento automático ante reportes.</li>
            </ul>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
