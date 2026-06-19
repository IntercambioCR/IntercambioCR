import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  Megaphone,
  PackagePlus,
  Repeat2,
  Sparkles,
  UsersRound
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { categories, trustRules } from "@/lib/constants";
import { getListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Publica tu artículo",
    body: "Sube fotos, indica qué buscas a cambio o asigna un valor sugerido en créditos.",
    Icon: PackagePlus
  },
  {
    title: "Recibe ofertas",
    body: "Otros usuarios pueden ofrecerte artículos, servicios o créditos para realizar el intercambio.",
    Icon: Repeat2
  },
  {
    title: "Coordina y completa el intercambio",
    body: "Elige la oferta que más te convenga y acuerda la entrega directamente con la otra persona.",
    Icon: Handshake
  }
];

function AdvertisingBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-ocean-100 bg-white shadow-soft">
        <div className="relative bg-gradient-to-br from-ocean-700 via-ocean-600 to-leaf-600 p-5 text-white sm:p-6 lg:p-8">
          <div className="absolute right-6 top-6 hidden h-24 w-24 rounded-full border border-white/20 sm:block" />
          <div className="absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
                <Megaphone className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                  <UsersRound className="h-3.5 w-3.5" />
                  Espacio publicitario
                </div>
                <h2 className="text-3xl font-bold">Anúnciate aquí</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
                  Promociona tu negocio, servicio, emprendimiento o evento ante cientos de usuarios en Costa Rica.
                </p>
                <p className="mt-3 text-sm font-semibold text-white">
                  Escríbenos a{" "}
                  <a className="underline decoration-white/50 underline-offset-4" href="mailto:info.intercambiocr@gmail.com">
                    info.intercambiocr@gmail.com
                  </a>
                </p>
              </div>
            </div>
            <a
              href="mailto:info.intercambiocr@gmail.com?subject=Informaci%C3%B3n%20para%20anunciarme%20en%20Intercambio%20CR"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-ocean-700 hover:bg-ocean-50"
            >
              Solicitar información
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const listings = await getListings();
  const newestListings = listings.slice(0, 2);

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:px-8 lg:py-10">
        <div className="min-w-0 flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-ocean-100 bg-white px-3 py-2 text-sm font-semibold text-ocean-700">
            <Sparkles className="h-4 w-4 text-leaf-600" />
            Comunidad de intercambio en Costa Rica
          </div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-normal text-ink sm:text-5xl">
            Dale una segunda oportunidad a lo que ya no usas.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Intercambia artículos con personas de Costa Rica o conviértelos en créditos para
            conseguir algo que realmente necesites.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Si prefieres recibir créditos directamente de Intercambio CR, recibimos artículos
            en nuestros puntos de Escazú Centro y Alajuela Centro.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/publicar"
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ocean-600 px-5 text-sm font-bold text-white hover:bg-ocean-500"
            >
              Publicar artículo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explorar"
              className="focus-ring inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-ink hover:bg-slate-50"
            >
              Explorar comunidad
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink">Nuevos ingresos</h2>
            <p className="text-sm text-slate-500">Publicaciones reales disponibles para intercambio</p>
          </div>
          {newestListings.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {newestListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Aún estamos sumando artículos. Sé de los primeros en publicar.
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-ink">¿Cómo funciona?</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-lg border border-slate-200 p-5">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(17rem,0.3fr)]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-ink">Artículos destacados</h2>
                <p className="text-sm text-slate-500">
                  Propón créditos, ofrece otro artículo o elige la mejor oferta.
                </p>
              </div>
              <Link href="/explorar" className="text-sm font-bold text-ocean-600">
                Ver todo
              </Link>
            </div>
            {listings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Aún estamos sumando artículos. Sé de los primeros en publicar.
              </div>
            )}
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink">Reglas de confianza</h2>
            <div className="mt-4 space-y-3">
              {trustRules.map((rule) => (
                <div key={rule} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                  <p className="text-sm leading-6 text-slate-600">{rule}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-ink">Categorías populares</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/explorar?categoria=${encodeURIComponent(category)}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-ocean-200 hover:text-ocean-700"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AdvertisingBanner />

      <section className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-leaf-100 bg-leaf-50 p-5">
          <h2 className="text-xl font-bold text-ink">¿Prefieres recibir créditos de inmediato?</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
            Intercambio CR también puede recibir ciertos artículos y asignarte créditos para usar
            dentro de la plataforma. Actualmente contamos con puntos de recepción en Escazú Centro y
            Alajuela Centro.
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Estos puntos aplican solo para artículos entregados directamente a Intercambio CR. Los
            intercambios entre usuarios se coordinan directamente entre las personas involucradas.
          </p>
          <Link
            href="/entregar"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-leaf-600 px-4 text-sm font-bold text-white hover:bg-leaf-500"
          >
            Entregar a Intercambio CR
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
