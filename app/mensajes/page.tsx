import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getConversations } from "@/lib/data/messages";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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
                href={conversation.href}
                className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-ocean-200 hover:shadow-soft"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-ocean-50 text-sm font-bold text-ocean-700">
                    {conversation.otherPersonAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conversation.otherPersonAvatar}
                        alt={conversation.otherPerson}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(conversation.otherPerson) || "IC"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate font-bold text-ink">{conversation.otherPerson}</p>
                      {conversation.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                          Nuevo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">{conversation.listingTitle}</p>
                    {conversation.kind === "intake" ? (
                      <p className="mt-1 text-xs font-bold text-ocean-700">Entrega a Intercambio CR</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">{conversation.updatedAt}</p>
                  </div>
                </div>
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
