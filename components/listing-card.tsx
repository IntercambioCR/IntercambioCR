import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatCredits } from "@/lib/utils";

type ListingCardProps = {
  listing: {
    id: string;
    title: string;
    category: string;
    condition: string;
    location: string;
    credits: number | null;
    looking_for?: string | null;
    image: string;
  };
};

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      href={`/articulos/${listing.id}`}
      className="group min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={listing.image.endsWith(".svg")}
        />
      </div>
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">
            {listing.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">
            {listing.category} / {listing.condition}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
            {listing.looking_for ? `Busca: ${listing.looking_for}` : "Abierto a ofertas"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-base font-bold text-ocean-600 sm:text-lg">
            {listing.credits ? `${formatCredits(listing.credits)} créditos` : "Abierto a ofertas"}
          </span>
          <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
