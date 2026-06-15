import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Flag, MessageCircle, Tag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { createListingOffer, startConversation } from "@/lib/actions/marketplace";
import { getListing } from "@/lib/data/listings";
import { formatCredits } from "@/lib/utils";

export default async function ListingDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const listing = await getListing(id);
  if (!listing) {
    notFound();
  }

  const images = listing.images?.length ? listing.images : [listing.image];

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <Image
              src={images[0]}
              alt={listing.title}
              fill
              className="object-cover"
              unoptimized={images[0].endsWith(".svg")}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {images.slice(0, 6).map((image, index) => (
              <div
                key={image}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <Image
                  src={image}
                  alt={`${listing.title} foto ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={image.endsWith(".svg")}
                />
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-xs font-bold text-leaf-700">
            <Tag className="h-4 w-4" />
            Publicación de la comunidad
          </div>
          <h1 className="break-words text-2xl font-bold text-ink">{listing.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {listing.category} / {listing.condition} / {listing.location}
          </p>
          <p className="mt-4 text-3xl font-bold text-ocean-600">
            {listing.credits ? `${formatCredits(listing.credits)} créditos` : "Abierto a ofertas"}
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-ink">¿Qué busca a cambio?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {listing.looking_for || "La persona está abierta a recibir ofertas en artículos, servicios o créditos."}
            </p>
          </div>
          <div className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4">
            {[
              "Puedes ofrecer créditos o proponer otro artículo como intercambio.",
              "La persona que lo publica elige la oferta que más le sirva.",
              "Si se usan créditos, quedan retenidos hasta que ambas partes confirmen.",
              "Intercambio CR no garantiza acuerdos entre usuarios; reporta cualquier señal de riesgo."
            ].map((step) => (
              <div key={step} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                <p className="text-sm leading-6 text-slate-600">{step}</p>
              </div>
            ))}
          </div>

          {ok ? (
            <div className="mt-5 rounded-lg border border-leaf-100 bg-leaf-50 p-3 text-sm font-semibold text-leaf-900">
              Oferta enviada. La persona dueña del artículo podrá revisarla.
            </div>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              No se pudo completar la acción: {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <form action={startConversation} className="rounded-lg border border-slate-200 p-4">
              <input type="hidden" name="listing_id" value={listing.id} />
              <label className="block text-sm font-medium text-slate-700">
                Enviar mensaje
                <textarea
                  name="message"
                  className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 p-3"
                  placeholder="Pregunta por disponibilidad, medidas, estado o lugar de entrega."
                />
              </label>
              <SubmitButton className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70">
                <MessageCircle className="h-4 w-4" />
                Abrir chat
              </SubmitButton>
            </form>

            <form action={createListingOffer} className="rounded-lg border border-ocean-100 bg-ocean-50 p-4">
              <input type="hidden" name="listing_id" value={listing.id} />
              <input type="hidden" name="offer_type" value="credits" />
              <h2 className="font-bold text-ink">Oferta en créditos</h2>
              <input
                name="credits"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={listing.credits ?? undefined}
                className="mt-3 h-12 w-full rounded-lg border border-ocean-100 bg-white px-3 text-sm"
                placeholder="Créditos ofrecidos"
              />
              <p className="mt-1 text-xs text-ocean-900">Solo números enteros desde 1 crédito.</p>
              <textarea
                name="message"
                className="mt-3 min-h-16 w-full rounded-lg border border-ocean-100 bg-white p-3 text-sm"
                placeholder="Mensaje opcional"
              />
              <SubmitButton className="mt-3 min-h-12 w-full rounded-lg bg-ocean-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                Hacer oferta en créditos
              </SubmitButton>
            </form>

            <form action={createListingOffer} className="rounded-lg border border-leaf-100 bg-leaf-50 p-4">
              <input type="hidden" name="listing_id" value={listing.id} />
              <input type="hidden" name="offer_type" value="item" />
              <h2 className="font-bold text-ink">Oferta con otro artículo</h2>
              <textarea
                name="offered_item_description"
                required
                className="mt-3 min-h-20 w-full rounded-lg border border-leaf-100 bg-white p-3 text-sm"
                placeholder="Describe el artículo que ofreces, estado, fotos disponibles y zona."
              />
              <textarea
                name="message"
                className="mt-3 min-h-16 w-full rounded-lg border border-leaf-100 bg-white p-3 text-sm"
                placeholder="Mensaje opcional"
              />
              <SubmitButton className="mt-3 min-h-12 w-full rounded-lg bg-leaf-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                Hacer oferta con artículo
              </SubmitButton>
            </form>

            <form action={createListingOffer} className="rounded-lg border border-slate-200 p-4">
              <input type="hidden" name="listing_id" value={listing.id} />
              <input type="hidden" name="offer_type" value="mixed" />
              <h2 className="font-bold text-ink">Oferta mixta</h2>
              <input
                name="credits"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                className="mt-3 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Créditos ofrecidos"
              />
              <p className="mt-1 text-xs text-slate-500">Solo números enteros desde 1 crédito.</p>
              <textarea
                name="offered_item_description"
                required
                className="mt-3 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
                placeholder="Describe el artículo que sumas a la oferta."
              />
              <textarea
                name="message"
                className="mt-3 min-h-16 w-full rounded-lg border border-slate-200 p-3 text-sm"
                placeholder="Mensaje opcional"
              />
              <SubmitButton className="mt-3 min-h-12 w-full rounded-lg bg-ink text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                Hacer oferta mixta
              </SubmitButton>
            </form>

            <a
              href={`/seguridad?listing=${listing.id}`}
              className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-white text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <Flag className="h-4 w-4" />
              Reportar publicación
            </a>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
