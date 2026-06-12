import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ocean-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-ocean-100 text-ocean-700">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Sin conexión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Puedes revisar algunas páginas guardadas. Las ofertas, créditos,
          reportes y mensajes necesitan conexión para proteger tus movimientos.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-ocean-600 px-5 text-sm font-bold text-white"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
