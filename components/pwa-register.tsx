"use client";

import { useEffect } from "react";

function logPwaError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.warn(`[Intercambio CR PWA] ${context}: ${error.message}`, error);
    return;
  }

  if (typeof Event !== "undefined" && error instanceof Event) {
    console.warn(`[Intercambio CR PWA] ${context}: evento ${error.type}`, error);
    return;
  }

  console.warn(`[Intercambio CR PWA] ${context}: ${String(error)}`, error);
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch((error: unknown) => {
              logPwaError("No se pudo desregistrar el service worker", error);
            });
          });
        })
        .catch((error: unknown) => {
          logPwaError("No se pudieron leer los service workers", error);
        });

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => {
            keys.forEach((key) => {
              caches.delete(key).catch((error: unknown) => {
                logPwaError(`No se pudo borrar la caché ${key}`, error);
              });
            });
          })
          .catch((error: unknown) => {
            logPwaError("No se pudieron leer las cachés", error);
          });
      }

      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures should not block the app.
      });
    });
  }, []);

  return null;
}
