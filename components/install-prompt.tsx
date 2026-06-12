"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!installEvent || hidden) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-3 right-3 z-50 rounded-lg border border-ocean-100 bg-white p-3 shadow-soft md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Instalar Intercambio CR</p>
          <p className="text-xs leading-5 text-slate-600">
            Acceso rápido desde tu pantalla principal.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="h-10 rounded-lg border border-slate-200 text-sm font-bold text-slate-700"
          onClick={() => setHidden(true)}
        >
          Luego
        </button>
        <button
          className="h-10 rounded-lg bg-ocean-600 text-sm font-bold text-white"
          onClick={async () => {
            await installEvent.prompt();
            await installEvent.userChoice;
            setHidden(true);
          }}
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
