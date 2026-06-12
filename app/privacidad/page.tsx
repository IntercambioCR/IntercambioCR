import { LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const privacyItems = [
  "Recolectamos datos necesarios para operar cuentas, publicaciones, ofertas, mensajes, reportes y créditos internos.",
  "Usamos la información para autenticar usuarios, mostrar perfiles, prevenir fraude, resolver reportes y mantener registros auditables.",
  "Los mensajes y reportes no son públicos; solo los participantes y administradores autorizados pueden revisarlos según las reglas de seguridad.",
  "Puedes solicitar acceso, corrección o eliminación de tus datos conforme a la normativa aplicable en Costa Rica.",
  "No compartas datos financieros, claves, códigos de verificación ni documentos sensibles dentro del chat."
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-xs font-bold text-leaf-700">
            <LockKeyhole className="h-4 w-4" />
            Privacidad
          </div>
          <h1 className="text-3xl font-bold text-ink">Política de privacidad</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Texto base para MVP. Debe revisarse legalmente antes del lanzamiento público.
          </p>
        </div>
        <div className="space-y-3">
          {privacyItems.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm leading-6 text-slate-600">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
