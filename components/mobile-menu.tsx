"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type MobileMenuItem = {
  href: string;
  label: string;
};

export function MobileMenu({ items }: { items: MobileMenuItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 xl:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menú principal">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-dvh w-[85vw] max-w-[360px] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-4">
              <p className="text-sm font-bold text-ink">Intercambio CR</p>
              <button
                type="button"
                className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm font-semibold leading-6 text-slate-700 hover:bg-slate-50 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
