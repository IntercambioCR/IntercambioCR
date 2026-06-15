import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCredits(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Abierto a ofertas";
  }

  return new Intl.NumberFormat("es-CR").format(value);
}
