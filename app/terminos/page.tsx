import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const terms = [
  "Intercambio entre usuarios: Intercambio CR facilita publicaciones, mensajes, ofertas y reportes, pero no garantiza que un acuerdo entre usuarios se complete.",
  "Entrega a Intercambio CR: la plataforma puede aceptar o rechazar artículos después de inspección física y solo emite créditos si el artículo es aprobado.",
  "Créditos: son saldo interno, no son dinero, no equivalen a colones y no se retiran en efectivo.",
  "Seguridad: cada usuario debe verificar el artículo, coordinar en lugares seguros y reportar comportamientos sospechosos.",
  "Moderación: Intercambio CR puede remover publicaciones, bloquear usuarios, congelar ofertas o revisar movimientos cuando detecte fraude, abuso o error operativo."
];

export default function TermsPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <FileText className="h-4 w-4" />
            Términos
          </div>
          <h1 className="text-3xl font-bold text-ink">Términos y condiciones</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Texto base para MVP. Debe revisarse con abogado y contador en Costa Rica antes de operar públicamente.
          </p>
        </div>
        <div className="space-y-3">
          {terms.map((term) => (
            <div key={term} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm leading-6 text-slate-600">{term}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
