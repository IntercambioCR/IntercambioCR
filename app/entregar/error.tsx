"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function EntregarError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Platform intake page error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      error
    });
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-red-800">
        <h1 className="text-xl font-bold">No pudimos cargar Entregar a Intercambio.</h1>
        <p className="mt-2 text-sm leading-6">
          Intenta nuevamente. Si el problema continúa, revisaremos el error técnico registrado.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-800"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
