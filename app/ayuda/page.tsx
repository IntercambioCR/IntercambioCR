import { AppShell } from "@/components/app-shell";

const faqs = [
  [
    "¿Intercambio CR garantiza los acuerdos entre usuarios?",
    "No. En intercambios entre usuarios, Intercambio CR facilita la tecnología, mensajes, ofertas y reportes, pero cada persona debe revisar el artículo y decidir si acepta."
  ],
  [
    "¿Cuándo Intercambio CR evalúa un artículo?",
    "Solo cuando entregas físicamente un artículo a Intercambio CR para recibir créditos. En ese caso la plataforma inspecciona, acepta o rechaza."
  ],
  [
    "¿Qué son los créditos?",
    "Son saldo interno para hacer ofertas dentro de Intercambio CR. No son dinero, no equivalen a colones y no se cambian por efectivo."
  ],
  [
    "¿Cómo obtengo créditos?",
    "Puedes obtener créditos cuando Intercambio CR recibe e inspecciona un artículo en Escazú, o cuando otra persona acepta una oferta con créditos por una publicación tuya."
  ],
  [
    "¿Puedo intercambiar sin créditos?",
    "Sí. Puedes aceptar un intercambio por otro artículo, aceptar créditos o elegir la mejor oferta recibida."
  ],
  [
    "¿Puedo enviar créditos libremente?",
    "No. Los créditos solo se mueven mediante ofertas asociadas a publicaciones y con aprobación de ambas partes."
  ],
  [
    "¿Qué pasa si hay un problema?",
    "La oferta puede entrar en disputa, congelando los créditos hasta que administración revise el caso."
  ],
  [
    "¿Los créditos son dinero?",
    "No. Son saldo interno, no equivalen a colones y no pueden retirarse como efectivo."
  ]
];

export default function HelpPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Ayuda</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Reglas básicas para intercambiar, ofrecer créditos y usar Intercambio CR de forma segura.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-ink">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-ink">Términos resumidos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Intercambio CR puede bloquear usuarios, congelar transacciones,
            rechazar artículos, remover publicaciones y ajustar créditos cuando
            detecte fraude, abuso, error operativo o incumplimiento de reglas.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
