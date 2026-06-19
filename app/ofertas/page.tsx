import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import {
  confirmListingCreditTransfer,
  startConversation,
  submitOfferRating,
  updateListingOfferStatus
} from "@/lib/actions/marketplace";
import { getOffers } from "@/lib/data/offers";

const statusLabels: Record<string, string> = {
  submitted: "Pendiente",
  accepted: "Aceptada",
  seller_accepted: "Aceptada por vendedor",
  completed: "Completada",
  rejected: "Rechazada",
  cancelled: "Cancelada"
};

export default async function OffersPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const offers = await getOffers();

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Ofertas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Revisa ofertas recibidas y enviadas. Las ofertas con créditos solo se transfieren cuando el vendedor acepta
            y el comprador confirma.
          </p>
        </div>

        {ok ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            {ok === "completed"
              ? "Transferencia confirmada correctamente."
              : ok === "rating"
                ? "Calificación enviada correctamente."
                : "Oferta actualizada correctamente."}
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo actualizar la oferta: {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {offers.length > 0 ? (
            offers.map((offer) => (
              <div key={offer.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-ocean-700">
                      {offer.direction === "received" ? "Recibida" : "Enviada"} / {offer.type}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-bold text-ink">{offer.listingTitle}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {offer.direction === "received"
                        ? `${offer.otherPerson} te ofreció ${offer.credits} créditos por ${offer.listingTitle}.`
                        : `Le ofreciste ${offer.credits} créditos a ${offer.otherPerson} por ${offer.listingTitle}.`}
                    </p>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      {offer.credits > 0 ? <p>{offer.credits} créditos</p> : null}
                      {offer.itemDescription ? <p>Artículo ofrecido: {offer.itemDescription}</p> : null}
                      {offer.message ? <p>Mensaje: {offer.message}</p> : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{offer.createdAt}</p>
                  </div>

                  <div className="w-full md:w-56 md:shrink-0">
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-700">
                      {statusLabels[offer.status] ?? offer.status}
                    </p>

                    {offer.direction === "received" && offer.status === "submitted" ? (
                      <div className="mt-3 grid gap-2">
                        <form action={updateListingOfferStatus}>
                          <input type="hidden" name="offer_id" value={offer.id} />
                          <input type="hidden" name="status" value="accepted" />
                          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-leaf-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                            <CheckCircle2 className="h-4 w-4" />
                            Aceptar oferta
                          </SubmitButton>
                        </form>
                        <form action={updateListingOfferStatus}>
                          <input type="hidden" name="offer_id" value={offer.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-white text-sm font-bold text-red-600 disabled:cursor-wait disabled:opacity-70">
                            <XCircle className="h-4 w-4" />
                            Rechazar oferta
                          </SubmitButton>
                        </form>
                        <form action={startConversation}>
                          <input type="hidden" name="listing_id" value={offer.listingId} />
                          <input
                            type="hidden"
                            name="message"
                            value={`Hola, quiero conversar sobre tu oferta por ${offer.listingTitle}.`}
                          />
                          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:cursor-wait disabled:opacity-70">
                            Enviar mensaje
                          </SubmitButton>
                        </form>
                      </div>
                    ) : null}

                    {offer.direction === "sent" && offer.status === "seller_accepted" && offer.credits > 0 ? (
                      <div className="mt-3 grid gap-2">
                        <form action={confirmListingCreditTransfer}>
                          <input type="hidden" name="offer_id" value={offer.id} />
                          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                            <CheckCircle2 className="h-4 w-4" />
                            Confirmar transferencia
                          </SubmitButton>
                        </form>
                        <p className="text-xs leading-5 text-slate-500">
                          Los créditos se mueven solo cuando confirmas esta transferencia.
                        </p>
                      </div>
                    ) : null}

                    {offer.status === "completed" ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        {offer.hasRated ? (
                          <p className="text-sm font-semibold text-slate-600">Ya calificaste este intercambio.</p>
                        ) : (
                          <form action={submitOfferRating} className="grid gap-2">
                            <input type="hidden" name="offer_id" value={offer.id} />
                            <input type="hidden" name="reviewed_user_id" value={offer.otherUserId} />
                            <label className="text-xs font-bold text-slate-600">
                              Calificación pendiente
                              <select
                                name="rating"
                                required
                                defaultValue="5"
                                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm"
                              >
                                <option value="5">5 estrellas</option>
                                <option value="4">4 estrellas</option>
                                <option value="3">3 estrellas</option>
                                <option value="2">2 estrellas</option>
                                <option value="1">1 estrella</option>
                              </select>
                            </label>
                            <textarea
                              name="comment"
                              className="min-h-16 rounded-lg border border-slate-200 p-2 text-sm"
                              placeholder="Comentario opcional"
                            />
                            <SubmitButton className="min-h-10 rounded-lg bg-ink px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                              Enviar calificación
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="font-bold text-ink">Todavía no tienes ofertas.</p>
              <p className="mt-2 text-sm text-slate-600">
                Cuando hagas o recibas una oferta por una publicación, aparecerá aquí.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
