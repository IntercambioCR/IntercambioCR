import { MailCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const messages = {
  registro: {
    title: "Revisa tu correo",
    body: "Revisa tu correo para confirmar tu cuenta."
  },
  recuperacion: {
    title: "Revisa tu correo",
    body: "Te enviamos un enlace para crear una nueva contraseña."
  },
  enlace: {
    title: "Revisa tu correo",
    body: "Te enviamos un enlace seguro para entrar a Intercambio CR."
  }
};

export default async function CheckEmailPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const message =
    tipo === "registro"
      ? messages.registro
      : tipo === "recuperacion"
        ? messages.recuperacion
        : messages.enlace;

  return (
    <AppShell>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-3xl place-items-center px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
          <MailCheck className="mx-auto h-10 w-10 text-ocean-600" />
          <h1 className="mt-4 text-2xl font-bold text-ink">{message.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message.body}</p>
        </div>
      </section>
    </AppShell>
  );
}
