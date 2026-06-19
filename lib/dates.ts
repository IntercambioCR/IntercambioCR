const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCostaRicaDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COSTA_RICA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatCostaRicaDate(value: DateInput) {
  const date = toDate(value);

  if (!date) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    timeZone: COSTA_RICA_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatCostaRicaShortDate(value: DateInput) {
  const date = toDate(value);

  if (!date) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    timeZone: COSTA_RICA_TIME_ZONE,
    day: "numeric",
    month: "short"
  }).format(date);
}

export function formatCostaRicaRelativeDate(value: DateInput) {
  const date = toDate(value);

  if (!date) {
    return "Fecha no disponible";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Hace menos de 1 min";
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (getCostaRicaDayKey(date) === getCostaRicaDayKey(yesterday)) {
    return "Ayer";
  }

  return formatCostaRicaDate(date);
}
