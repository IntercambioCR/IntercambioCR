import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getConversations } from "@/lib/data/messages";

export default async function MessagesPage() {
  const conversations = await getConversations();

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
            <MessageCircle className="h-4 w-4" />
            Mensajes
          </div>
          <h1 className="text-3xl font-bold text-ink">Conversaciones</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Habla con otras personas antes de aceptar una oferta. Intercambio CR no garantiza acuerdos entre usuarios.
          </p>
        </div>

        <div className="space-y-3">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/mensajes/${conversation.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-ocean-200 hover:shadow-soft"
              >
                <p className="font-bold text-ink">{conversation.listingTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{conversation.otherPerson}</p>
                <p className="mt-2 text-xs text-slate-500">{conversation.updatedAt}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="font-bold text-ink">Todavía no tienes conversaciones.</p>
              <p className="mt-2 text-sm text-slate-600">
                Abre una publicación y usa “Enviar mensaje” para iniciar un chat.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
