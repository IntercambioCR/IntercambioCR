import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Users,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  adminAdjustCredits,
  adminBlockUser,
  adminIssueIntakeCredits,
  adminMakeIntakeOffer,
  adminRejectIntake,
  adminRequestIntakeInfo,
  adminUpdateListingStatus,
  adminUpdateReportStatus
} from "@/lib/actions/credits";
import { getAdminData, type AdminData } from "@/lib/data/admin";
import { isCurrentUserAdmin } from "@/lib/data/session";
import { SubmitButton } from "@/components/submit-button";

const pendingStatuses = new Set(["submitted", "offer_made", "scheduled", "received", "needs_info"]);
const approvedStatuses = new Set(["approved", "paid"]);
const rejectedStatuses = new Set(["rejected"]);

function IntakeCard({ intake }: { intake: AdminData["intakes"][number] }) {
  return (
    <div className="grid min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        {intake.images.length > 0 ? (
          intake.images.slice(0, 3).map((image) => (
            <Image
              key={image}
              src={image}
              alt={intake.title}
              width={160}
              height={160}
              className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
            />
          ))
        ) : (
          <div className="col-span-3 flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500 lg:col-span-1">
            Sin fotos
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-ocean-700">{intake.status}</p>
            <h3 className="mt-1 break-words font-bold text-ink">{intake.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {intake.user} / {intake.category} / {intake.created}
            </p>
            <p className="mt-1 text-sm font-bold text-ocean-700">{intake.offer}</p>
          </div>
          <Link
            href={`/admin/entregas/${intake.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 text-xs font-bold text-white"
          >
            Revisar
          </Link>
        </div>

        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
          <form action={adminMakeIntakeOffer} className="grid gap-2 rounded-lg bg-ocean-50 p-3">
            <input type="hidden" name="intake_id" value={intake.id} />
            <input
              name="offered_credits"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              className="min-h-11 rounded-lg border border-ocean-100 px-3 text-sm"
              placeholder="Credis"
            />
            <input
              name="notes"
              className="min-h-11 rounded-lg border border-ocean-100 px-3 text-sm"
              placeholder="Notas"
            />
            <SubmitButton className="min-h-11 rounded-lg bg-ocean-600 px-2 py-2 text-xs font-bold text-white disabled:opacity-70">
              Aprobar y asignar
            </SubmitButton>
          </form>

          <form action={adminRequestIntakeInfo} className="grid gap-2 rounded-lg bg-amber-50 p-3">
            <input type="hidden" name="intake_id" value={intake.id} />
            <input
              name="notes"
              required
              className="min-h-11 rounded-lg border border-amber-100 px-3 text-sm"
              placeholder="Información requerida"
            />
            <SubmitButton className="min-h-11 rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs font-bold text-amber-800 disabled:opacity-70">
              Pedir más información
            </SubmitButton>
          </form>

          <form action={adminRejectIntake} className="grid gap-2 rounded-lg bg-red-50 p-3">
            <input type="hidden" name="intake_id" value={intake.id} />
            <input
              name="notes"
              required
              className="min-h-11 rounded-lg border border-red-100 px-3 text-sm"
              placeholder="Motivo"
            />
            <SubmitButton className="min-h-11 rounded-lg border border-red-100 bg-white px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-70">
              Rechazar
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function IntakeSection({
  title,
  description,
  intakes
}: {
  title: string;
  description: string;
  intakes: AdminData["intakes"];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white/60 p-4">
      <div className="mb-4">
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">
        {intakes.length > 0 ? (
          intakes.map((intake) => <IntakeCard key={intake.id} intake={intake} />)
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
            No hay solicitudes en esta bandeja.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string; q?: string }>;
}) {
  const { ok, error, q } = await searchParams;
  const canAccessAdmin = await isCurrentUserAdmin();

  if (!canAccessAdmin) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-100 bg-white p-6">
            <h1 className="text-2xl font-bold text-ink">Acceso restringido</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Solo una cuenta con rol admin puede entrar al panel administrador.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

  const adminData = await getAdminData(q ?? "");
  const pendingIntakes = adminData.intakes.filter((intake) => pendingStatuses.has(intake.status));
  const approvedIntakes = adminData.intakes.filter((intake) => approvedStatuses.has(intake.status));
  const rejectedIntakes = adminData.intakes.filter((intake) => rejectedStatuses.has(intake.status));
  const metrics: Array<{ label: string; value: string; Icon: LucideIcon }> = [
    { label: "Usuarios", value: String(adminData.metrics.users), Icon: Users },
    { label: "Publicaciones", value: String(adminData.metrics.listings), Icon: CheckCircle2 },
    { label: "Reportes abiertos", value: String(adminData.metrics.reports), Icon: AlertTriangle },
    { label: "Intercambios", value: String(adminData.metrics.trades), Icon: CircleDollarSign }
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink">Panel administrador</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Control operativo para usuarios, publicaciones, solicitudes privadas, credis, reportes y seguridad.
          </p>
        </div>

        {ok ? (
          <div className="mb-5 rounded-lg border border-leaf-100 bg-leaf-50 p-4 text-sm font-semibold text-leaf-900">
            Acción completada correctamente.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            No se pudo completar la acción: {error}
          </div>
        ) : null}

        <form className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row" action="/admin">
          <input
            name="q"
            defaultValue={q ?? ""}
            className="h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Buscar usuario por nombre o ID"
          />
          <button className="min-h-11 rounded-lg bg-ocean-600 px-5 text-sm font-bold text-white hover:bg-ocean-500">
            Buscar usuario
          </button>
          {q ? (
            <Link href="/admin" className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-bold text-ink">
              Limpiar
            </Link>
          ) : null}
        </form>

        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <Icon className="h-5 w-5 text-ocean-600" />
              <p className="mt-3 text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5">
          <div className="flex gap-2 rounded-lg border border-ocean-100 bg-ocean-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-ocean-700" />
            <p className="text-sm leading-6 text-ocean-900">
              Las solicitudes de Entregar a Intercambio CR son privadas. No se muestran en Inicio,
              Explorar, categorías, búsqueda ni perfil público. Solo aparecen en este panel.
            </p>
          </div>
          <IntakeSection
            title="Solicitudes pendientes"
            description="Artículos enviados para revisión interna, inspección o información adicional."
            intakes={pendingIntakes}
          />
          <IntakeSection
            title="Solicitudes aprobadas"
            description="Artículos aprobados o ya pagados con credis."
            intakes={approvedIntakes}
          />
          <IntakeSection
            title="Solicitudes rechazadas"
            description="Solicitudes cerradas con motivo de rechazo."
            intakes={rejectedIntakes}
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-ink">Usuarios registrados</h2>
              <p className="mt-1 text-sm text-slate-500">Bloqueo operativo sin permitir autorregistro admin.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {adminData.users.map((user) => (
                <div key={user.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-bold text-ink">{user.name}</p>
                    <p className="text-slate-500">
                      {user.role} / {user.blocked ? "Bloqueado" : "Activo"} / {user.created}
                    </p>
                    <p className="break-all text-xs text-slate-400">{user.id}</p>
                  </div>
                  <form action={adminBlockUser} className="flex gap-2">
                    <input type="hidden" name="user_id" value={user.id} />
                    <input type="hidden" name="blocked" value={String(!user.blocked)} />
                    <SubmitButton className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-bold text-ink disabled:opacity-70">
                      {user.blocked ? "Desbloquear" : "Bloquear"}
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-ink">Publicaciones públicas</h2>
              <p className="mt-1 text-sm text-slate-500">Solo las publicaciones creadas desde Publicar aparecen en el marketplace.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {adminData.listings.map((listing) => (
                <div key={listing.id} className="grid gap-3 p-4 text-sm">
                  <div>
                    <p className="font-bold text-ink">{listing.title}</p>
                    <p className="text-slate-500">{listing.category} / {listing.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["available", "Aprobar"],
                      ["rejected", "Rechazar"],
                      ["removed", "Eliminar"]
                    ].map(([status, label]) => (
                      <form key={status} action={adminUpdateListingStatus}>
                        <input type="hidden" name="listing_id" value={listing.id} />
                        <input type="hidden" name="status" value={status} />
                        <SubmitButton className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink disabled:opacity-70">
                          {label}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-ink">Reportes y mensajes reportados</h2>
              <p className="mt-1 text-sm text-slate-500">Revisar y cerrar reportes de usuarios.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {adminData.reports.map((report) => (
                <div key={report.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-bold text-ink">{report.reason}</p>
                    <p className="text-slate-500">{report.status} / {report.created}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["reviewing", "Revisar"],
                      ["resolved", "Resolver"],
                      ["dismissed", "Descartar"]
                    ].map(([status, label]) => (
                      <form key={status} action={adminUpdateReportStatus}>
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="status" value={status} />
                        <SubmitButton className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink disabled:opacity-70">
                          {label}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-ink">Intercambios en proceso</h2>
              <p className="mt-1 text-sm text-slate-500">Vista operativa de compras/ofertas con credis.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {adminData.trades.map((trade) => (
                <div key={trade.id} className="p-4 text-sm">
                  <p className="break-all font-bold text-ink">{trade.id}</p>
                  <p className="text-slate-500">{trade.status} / {trade.credits} / {trade.created}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <form action={adminIssueIntakeCredits} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Emitir credis por entrega aprobada</h2>
            <p className="mt-1 text-sm text-slate-500">
              Solo después de recibir y aprobar físicamente el artículo en Escazú Centro o Alajuela Centro.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                name="intake_id"
                required
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="ID de solicitud aprobada"
              />
              <SubmitButton
                pendingLabel="Emitiendo..."
                className="h-11 rounded-lg bg-leaf-600 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70"
              >
                Emitir credis auditados
              </SubmitButton>
            </div>
          </form>

          <form action={adminAdjustCredits} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-ink">Ajuste manual de credis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Solo para ajustes operativos auditados. Usa montos positivos para emitir y negativos para reversar.
            </p>
            <div className="mt-4 grid gap-3">
              <input name="user_id" required className="h-11 rounded-lg border border-slate-200 px-3 text-sm" placeholder="ID de usuario" />
              <input name="amount" required inputMode="numeric" pattern="-?[0-9]*" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Monto en credis" />
              <p className="text-xs text-slate-500">Usa enteros: 100 para emitir o -100 para reversar.</p>
              <textarea name="note" required className="min-h-20 rounded-lg border border-slate-200 p-3 text-sm" placeholder="Motivo del ajuste" />
              <SubmitButton pendingLabel="Registrando..." className="h-11 rounded-lg bg-ink text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                Registrar ajuste auditado
              </SubmitButton>
            </div>
          </form>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-bold text-ink">Historial de credis emitidos</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {adminData.creditMovements.map((movement) => (
              <div key={movement.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold text-ink">{movement.note}</p>
                  <p className="break-all text-xs text-slate-500">{movement.user}</p>
                </div>
                <p className="font-bold text-ocean-700">{movement.amount} / {movement.created}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
