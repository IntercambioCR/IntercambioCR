import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getMyListings } from "@/lib/data/my-listings";
import { formatCredits } from "@/lib/utils";

export default async function MyListingsPage() {
  const listings = await getMyListings();

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Mis publicaciones</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Revisa los artículos que publicaste para recibir ofertas de la comunidad.
          </p>
        </div>
        <div className="space-y-3">
          {listings.length > 0 ? (
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/articulos/${listing.id}`}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-5 hover:border-ocean-200 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-bold text-ink">{listing.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{listing.category} / {listing.status}</p>
                </div>
                <p className="font-bold text-ocean-700">{formatCredits(listing.credits)} créditos</p>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="font-bold text-ink">Todavía no tienes publicaciones.</p>
              <Link href="/publicar" className="mt-4 inline-flex h-11 items-center rounded-lg bg-leaf-600 px-5 text-sm font-bold text-white">
                Publicar artículo
              </Link>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
