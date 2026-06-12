import { ArrowDownLeft } from "lucide-react";

type CreditLedgerProps = {
  rows: Array<{
    label: string;
    date: string;
    amount: string;
    tone: string;
    balance?: string;
  }>;
};

export function CreditLedger({ rows }: CreditLedgerProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-base font-semibold text-ink">Movimientos auditados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cada cambio de saldo queda registrado y no se elimina.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <ArrowDownLeft className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{row.label}</p>
              <p className="text-xs text-slate-500">
                {row.date}{row.balance ? ` / saldo ${row.balance}` : ""}
              </p>
            </div>
            <span className={`ml-12 text-sm font-bold sm:ml-0 ${row.tone}`}>{row.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
