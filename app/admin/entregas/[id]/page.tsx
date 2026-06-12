import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, ShieldCheck, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  adminIssueIntakeCredits,
  adminMakeIntakeOffer,
  adminRejectIntake,
  adminRequestIntakeInfo
} from "@/lib/actions/credits";
import { getAdminIntake } from "@/lib/data/admin";
import { isCurrentUserAdmin } from "@/lib/data/session";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminIntakeReviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const canAccessAdmin = await isCurrentUserAdmin();
  const { id } = await params;

  if (!canAccessAdmin) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-100 bg-white p-6">
            <h1 className="text-2xl font-bold text-ink">Acceso restringido</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Solo una cuenta admin puede revisar solicitudes privadas y emitir credis.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

  const intake = await getAdminIntake(id);

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ocean-700">
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-700">
              <ShieldCheck className="h-4 w-4" />
              Solicitud privada de entrega
            </div>
            <h1 className="break-words text-3xl font-bold text-ink">{intake.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {intake.category} / {intake.condition} / {intake.dropoff_location}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-2 rounded-lg border border-slate-200 p-4">
                <User className="mt-0.5 h-4 w-4 text-ocean-600" />
                <div>
                  <p className="text-xs text-slate-500">Usuario</p>
                  <p className="font-bold text-ink">{intake.userName}</p>
                </div>
              </div>
              <div className="flex gap-2 rounded-lg border border-slate-200 p-4">
                <CalendarDays className="mt-0.5 h-4 w-4 text-ocean-600" />
                <div>
                  <p className="text-xs text-slate-500">Fecha de envío</p>
                  <p className="font-bold text-ink">{intake.created}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Estado</p>
                <p className="mt-1 font-bold text-ink">{intake.status}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Oferta actual</p>
                <p className="mt-1 font-bold text-ocean-700">
                  {intake.offered_credits ? `${intake.offered_credits} credis` : "Sin oferta"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">ID</p>
                <p className="mt-1 break-all text-xs font-bold text-ink">{intake.id}</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <h2 className="font-bold text-ink">Descripción enviada</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{intake.description}</p>
            </div>

            {intake.inspection_notes ? (
              <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
                <h2 className="font-bold text-amber-900">Notas administrativas</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">{intake.inspection_notes}</p>
              </div>
            ) : null}

            <div className="mt-5">
              <h2 className="font-bold text-ink">Fotos enviadas</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {intake.images.length > 0 ? (
                  intake.images.map((image) => (
                    <Image
                      key={image}
                      src={image}
                      alt={intake.title}
                      width={320}
                      height={320}
                      className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                    Esta solicitud no tiene fotos.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <form action={adminMakeIntakeOffer} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-ink">Aprobar y asignar credis</h2>
              <input type="hidden" name="intake_id" value={intake.id} />
              <div className="mt-4 grid gap-3">
                <input
                  name="offered_credits"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
                  placeholder="Credis ofrecidos"
                />
                <p className="text-xs text-slate-500">Número entero desde 1 credi.</p>
                <textarea
                  name="notes"
                  className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm"
                  placeholder="Notas de inspección"
                />
                <SubmitButton
                  pendingLabel="Guardando..."
                  className="min-h-12 rounded-lg bg-ocean-600 px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70"
                >
                  Aprobar solicitud
                </SubmitButton>
              </div>
            </form>

            <form action={adminIssueIntakeCredits} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-ink">Emitir credis</h2>
              <input type="hidden" name="intake_id" value={intake.id} />
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Usa este botón solo después de recibir y aprobar físicamente el artículo.
              </p>
              <SubmitButton
                pendingLabel="Emitiendo..."
                className="mt-4 min-h-12 w-full rounded-lg bg-leaf-600 px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70"
              >
                Emitir credis auditados
              </SubmitButton>
            </form>

            <form action={adminRequestIntakeInfo} className="rounded-lg border border-amber-100 bg-white p-5">
              <h2 className="font-bold text-ink">Solicitar más información</h2>
              <input type="hidden" name="intake_id" value={intake.id} />
              <textarea
                name="notes"
                required
                className="mt-3 min-h-20 w-full rounded-lg border border-amber-100 p-3 text-sm"
                placeholder="Qué debe aclarar o enviar el usuario"
              />
              <SubmitButton
                pendingLabel="Enviando..."
                className="mt-4 min-h-12 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-800 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-70"
              >
                Pedir información
              </SubmitButton>
            </form>

            <form action={adminRejectIntake} className="rounded-lg border border-red-100 bg-white p-5">
              <h2 className="font-bold text-ink">Rechazar solicitud</h2>
              <input type="hidden" name="intake_id" value={intake.id} />
              <textarea
                name="notes"
                required
                className="mt-3 min-h-20 w-full rounded-lg border border-red-100 p-3 text-sm"
                placeholder="Motivo del rechazo"
              />
              <SubmitButton
                pendingLabel="Rechazando..."
                className="mt-4 min-h-12 w-full rounded-lg border border-red-100 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
              >
                Rechazar solicitud
              </SubmitButton>
            </form>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
