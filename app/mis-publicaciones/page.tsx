import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { removeOwnListing } from "@/lib/actions/credits";
import { getMyListings } from "@/lib/data/my-listings";
import { formatCredits } from "@/lib/utils";

export default async function MyListingsPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
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

        {ok === "eliminada" ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            Publicación eliminada correctamente.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {listings.length > 0 ? (
            listings.map((listing) => (
              <div
                key={listing.id}
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <Link href={`/articulos/${listing.id}`} className="font-bold text-ink hover:text-ocean-700">
                    {listing.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {listing.category} / {listing.status}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {listing.looking_for ? `Busca: ${listing.looking_for}` : "Abierto a ofertas"}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <p className="font-bold text-ocean-700">
                    {listing.credits ? `${formatCredits(listing.credits)} créditos` : "Abierto a ofertas"}
                  </p>
                  {listing.status !== "removed" ? (
                    <form action={removeOwnListing}>
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <DeleteListingButton />
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="font-bold text-ink">Todavía no tienes publicaciones.</p>
              <Link
                href="/publicar"
                className="mt-4 inline-flex h-11 items-center rounded-lg bg-leaf-600 px-5 text-sm font-bold text-white"
              >
                Publicar artículo
              </Link>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
