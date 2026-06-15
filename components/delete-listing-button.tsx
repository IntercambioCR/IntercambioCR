"use client";

import { useFormStatus } from "react-dom";

export function DeleteListingButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("¿Quieres eliminar esta publicación? Ya no aparecerá en Inicio ni en Explorar.")) {
          event.preventDefault();
        }
      }}
      className="min-h-10 rounded-lg border border-red-100 px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
