import { AppShell } from "@/components/app-shell";
import { ExploreClient } from "@/components/explore-client";
import { getListings } from "@/lib/data/listings";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const listings = await getListings();

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Explorar artículos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Encuentra artículos para proponer un intercambio, ofrecer créditos o elegir algo útil para ti.
          </p>
        </div>
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo crear la solicitud: {error}
          </div>
        ) : null}

        <ExploreClient listings={listings} />
      </section>
    </AppShell>
  );
}
