import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Handshake, PackagePlus, Repeat2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { categories, trustRules } from "@/lib/constants";
import type { ListingSummary } from "@/lib/data/listings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fallbackImage = "/demo/hero-intercambio-real.png";

async function getHomeListings(): Promise<ListingSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("listings")
      .select("id,title,category,condition,location,credit_price,looking_for,description,listing_images(storage_path,sort_order)")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(24);

    if (error || !data) {
      return [];
    }

    return data.map((listing): ListingSummary => {
      const imagePaths =
        listing.listing_images
          ?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((item: { storage_path: string }) => item.storage_path) ?? [];
      const images = imagePaths.map(
        (path) => supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl
      );

      return {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        condition: listing.condition,
        location: listing.location,
        credits: listing.credit_price,
        looking_for: listing.looking_for,
        image: images[0] ?? fallbackImage,
        images: images.length > 0 ? images : [fallbackImage],
        description: listing.description
      };
    });
  } catch (error) {
    console.error("No se pudieron cargar las publicaciones del inicio.", error);
    return [];
  }
}

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

export default async function HomePage() {
  const listings = await getHomeListings();
  const newestListings = listings.slice(0, 2);

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:px-8 lg:py-10">
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
          <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
            <Image
              src="/demo/hero-intercambio-real.png"
              alt="Personas intercambiando artículos en Intercambio CR"
              fill
              priority
              className="object-cover"
            />
          </div>
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
              No hay publicaciones disponibles por ahora.
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

      <section className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
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
                No hay publicaciones disponibles por ahora.
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
    </AppShell>
  );
}
