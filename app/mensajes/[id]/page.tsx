import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { sendDirectMessage } from "@/lib/actions/marketplace";
import { getConversation } from "@/lib/data/messages";

export default async function ConversationPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const conversation = await getConversation(id);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <Link href="/mensajes" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ocean-700">
          <ArrowLeft className="h-4 w-4" />
          Volver a mensajes
        </Link>

        {!conversation ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-ink">Conversación no disponible</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Puede que no tengas acceso o que falte configurar las tablas de mensajes en Supabase.
            </p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h1 className="text-2xl font-bold text-ink">{conversation.listingTitle}</h1>
              <p className="mt-1 text-sm text-slate-600">Conversación con {conversation.otherPerson}</p>
            </div>

            {error ? (
              <div className="m-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                No se pudo enviar el mensaje: {error}
              </div>
            ) : null}

            <div className="space-y-3 p-4 sm:p-5">
              {conversation.messages.length > 0 ? (
                conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[92%] break-words rounded-lg p-3 sm:max-w-[85%] ${
                      message.isOwn
                        ? "ml-auto bg-ocean-600 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-bold opacity-80">{message.senderName}</p>
                    <p className="mt-1 text-sm leading-6">{message.body}</p>
                    <p className="mt-2 text-[11px] opacity-70">{message.createdAt}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  Todavía no hay mensajes. Escribe el primero para coordinar detalles.
                </p>
              )}
            </div>

            <form action={sendDirectMessage} className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <textarea
                name="body"
                required
                className="min-h-20 min-w-0 rounded-lg border border-slate-200 p-3 text-sm"
                placeholder="Escribe un mensaje..."
              />
              <SubmitButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ocean-600 px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                <Send className="h-4 w-4" />
                Enviar
              </SubmitButton>
            </form>
          </div>
        )}
      </section>
    </AppShell>
  );
}
