"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { categories, conditions } from "@/lib/constants";
import type { ListingSummary } from "@/lib/data/listings";

type ExploreClientProps = {
  listings: ListingSummary[];
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ExploreClient({ listings }: ExploreClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [minCredits, setMinCredits] = useState("");
  const [maxCredits, setMaxCredits] = useState("");

  const filteredListings = useMemo(() => {
    const normalizedQuery = normalize(query);
    const normalizedLocation = normalize(location);
    const min = Number(minCredits);
    const max = Number(maxCredits);

    return listings.filter((listing) => {
      const searchable = normalize(
        `${listing.title} ${listing.category} ${listing.condition} ${listing.location} ${listing.description ?? ""}`
      );

      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (category && listing.category !== category) return false;
      if (condition && listing.condition !== condition) return false;
      if (normalizedLocation && !normalize(listing.location).includes(normalizedLocation)) return false;
      if (minCredits && Number.isFinite(min) && (listing.credits === null || listing.credits < min)) return false;
      if (maxCredits && Number.isFinite(max) && (listing.credits === null || listing.credits > max)) return false;

      return true;
    });
  }, [category, condition, listings, location, maxCredits, minCredits, query]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="h-fit min-w-0 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-ocean-600" />
          <h2 className="font-semibold text-ink">Filtros</h2>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Buscar
          <span className="mt-2 flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 w-full border-0 bg-transparent text-sm outline-none"
              placeholder="Artículo, marca o zona"
            />
          </span>
        </label>
        <div className="mt-4 grid gap-3">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Cualquier estado</option>
            {conditions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Ubicación"
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <input
              value={minCredits}
              onChange={(event) => setMinCredits(event.target.value)}
              className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"
              inputMode="numeric"
              placeholder="Mín. créditos"
            />
            <input
              value={maxCredits}
              onChange={(event) => setMaxCredits(event.target.value)}
              className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"
              inputMode="numeric"
              placeholder="Máx. créditos"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("");
              setCondition("");
              setLocation("");
              setMinCredits("");
              setMaxCredits("");
            }}
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <p className="mb-3 text-sm text-slate-500">
          {filteredListings.length} resultado{filteredListings.length === 1 ? "" : "s"}
        </p>
        {filteredListings.length > 0 ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="font-bold text-ink">No encontramos artículos con esos filtros.</p>
            <p className="mt-2 text-sm text-slate-600">
              Prueba con otra categoría, zona o rango de créditos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
