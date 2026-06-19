import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const sections = [
  {
    title: "Intercambio entre usuarios",
    body: "Cuando dos usuarios negocian una publicación, Intercambio CR funciona como intermediario tecnológico: facilita mensajes, ofertas, reportes y registro básico del proceso, pero no garantiza la calidad del artículo ni obliga a las partes a cerrar un acuerdo."
  },
  {
    title: "Entrega a Intercambio CR",
    body: "Cuando entregas un artículo físicamente a Intercambio CR para recibir créditos, la plataforma sí revisa el artículo, decide si lo acepta o lo rechaza y emite créditos solo después de la inspección aprobada."
  },
  {
    title: "Créditos internos",
    body: "Los créditos son saldo interno de Intercambio CR. No son dinero, no equivalen a colones, no son redimibles por efectivo y solo se usan dentro de ofertas asociadas a publicaciones o entregas aprobadas por Intercambio CR."
  },
  {
    title: "Privacidad",
    body: "La plataforma debe informar por qué recolecta datos, cómo los usa, quién puede consultarlos y cómo el usuario puede ejercer sus derechos sobre sus datos personales."
  },
  {
    title: "Consumidor",
    body: "Cada publicación debe mostrar condición, fotos, valor sugerido en créditos, persona oferente, ubicación aproximada y reglas de reporte antes de hacer una oferta."
  },
  {
    title: "Bienes usados",
    body: "La operación de recepción, compra interna y reventa de artículos usados debe validarse con contador para facturación electrónica, IVA y registros contables aplicables."
  }
];

export default function LegalPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <FileText className="h-4 w-4" />
            Base legal-operativa
          </div>
          <h1 className="text-3xl font-bold text-ink">Términos y privacidad</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Texto base para la operación. Debe revisarse con abogado y contador en Costa Rica antes de operar.
          </p>
        </div>
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-ink">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-ocean-100 bg-ocean-50 p-5">
          <h2 className="font-bold text-ink">Contacto oficial</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            ¿Tienes dudas, sugerencias o quieres anunciarte en Intercambio CR? Escríbenos a{" "}
            <a className="font-bold text-ocean-700 underline underline-offset-4" href="mailto:info.intercambiocr@gmail.com">
              info.intercambiocr@gmail.com
            </a>
          </p>
        </div>
      </section>
    </AppShell>
  );
}
