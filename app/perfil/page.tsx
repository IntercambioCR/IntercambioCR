import Link from "next/link";
import Image from "next/image";
import { Calendar, Camera, MapPin, MessageCircle, Settings, Star, Tag, UserRound, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { signOut, updateAccountPassword, updateAvatar, updateProfile } from "@/lib/auth/actions";
import { getConversations } from "@/lib/data/messages";
import { getMyListings } from "@/lib/data/my-listings";
import { getOffers } from "@/lib/data/offers";
import { getCurrentProfile } from "@/lib/data/session";
import { getWalletData } from "@/lib/data/wallet";

function safeAvatarUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return value.startsWith("/") ? value : null;
  }
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader();
  } catch (error) {
    console.error("[Intercambio CR perfil] No se pudo cargar una sección del perfil", error);
    return fallback;
  }
}

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const profile = await getCurrentProfile();
  const avatarUrl = safeAvatarUrl(profile?.avatar_url);
  const [listings, offers, conversations, wallet] = profile
    ? await Promise.all([
        safeLoad(() => getMyListings(), []),
        safeLoad(() => getOffers(), []),
        safeLoad(() => getConversations(), []),
        safeLoad(() => getWalletData(), { balances: [], movements: [] })
      ])
    : [[], [], [], { balances: [], movements: [] }];
  const sentOffers = offers.filter((offer) => offer.direction === "sent");
  const receivedOffers = offers.filter((offer) => offer.direction === "received");

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-lg bg-ocean-100 text-3xl font-bold text-ocean-700">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={profile?.full_name ? `Foto de ${profile.full_name}` : "Foto de perfil"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : profile?.full_name ? (
                  profile.full_name.slice(0, 2).toUpperCase()
                ) : (
                  <UserRound className="h-10 w-10" />
                )}
              </div>
              {profile ? (
                <form action={updateAvatar} className="mt-3 grid w-56 max-w-full gap-2">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="avatar">
                    Cambiar foto de perfil
                  </label>
                  <input
                    id="avatar"
                    name="avatar"
                    required
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="text-xs text-slate-600 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-ocean-50 file:px-3 file:text-xs file:font-bold file:text-ocean-700"
                  />
                  <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-ink hover:bg-slate-50">
                    <Camera className="h-4 w-4" />
                    Subir foto
                  </button>
                  <p className="text-xs leading-5 text-slate-500">JPG, PNG o WebP. Máximo 3 MB.</p>
                </form>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold text-ink">
                {profile?.full_name ?? "Tu perfil de Intercambio"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {profile
                  ? profile.bio ?? "Perfil con reputación visible, ubicación e historial de intercambios."
                  : "Entra para ver tu reputación, tus ofertas, tus créditos y tu historial."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {profile?.location ?? "Costa Rica"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {profile?.rating ?? "Nuevo"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Desde 2026
                </span>
              </div>
              {!profile ? (
                <Link
                  href="/auth"
                  className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-ocean-600 px-5 text-sm font-bold text-white"
                >
                  Entrar o crear cuenta
                </Link>
              ) : (
                <form action={signOut} className="mt-5">
                  <button className="min-h-11 rounded-lg border border-slate-200 px-5 text-sm font-bold text-ink hover:bg-slate-50">
                    Cerrar sesión
                  </button>
                </form>
              )}
            </div>
          </div>

          {ok ? (
            <div className="mt-5 rounded-lg border border-leaf-100 bg-leaf-50 p-3 text-sm font-semibold text-leaf-900">
              {ok === "cuenta-creada"
                ? "Cuenta creada correctamente."
                : ok === "avatar"
                  ? "Foto de perfil actualizada correctamente."
                  : ok === "contrasena"
                    ? "Contraseña actualizada correctamente."
                    : "Cambios guardados correctamente."}
            </div>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Intercambios", String(profile?.completed_trades ?? 0)],
              ["Ofertas enviadas", String(sentOffers.length)],
              ["Ofertas recibidas", String(receivedOffers.length)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["/mis-publicaciones", "Mis publicaciones", Tag],
              ["/billetera", "Mis créditos", WalletCards],
              ["/ofertas", "Mis ofertas", Star],
              ["/mensajes", "Mis mensajes", MessageCircle],
              ["#configuracion", "Cuenta", Settings]
            ].map(([href, label, Icon]) => (
              <Link
                key={String(href)}
                href={String(href)}
                className="flex min-h-24 flex-col justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-ink hover:border-ocean-200 hover:text-ocean-700"
              >
                <Icon className="h-5 w-5 text-ocean-600" />
                {String(label)}
              </Link>
            ))}
          </div>

          {profile ? (
            <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
              <section className="rounded-lg border border-slate-200 p-4">
                <h2 className="font-bold text-ink">Resumen de tu actividad</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SummaryCard label="Publicaciones" value={String(listings.length)} href="/mis-publicaciones" />
                  <SummaryCard label="Mensajes" value={String(conversations.length)} href="/mensajes" />
                  <SummaryCard label="Ofertas enviadas" value={String(sentOffers.length)} href="/ofertas" />
                  <SummaryCard label="Ofertas recibidas" value={String(receivedOffers.length)} href="/ofertas" />
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-ink">Créditos disponibles</p>
                  <p className="mt-1 text-2xl font-bold text-ocean-700">
                    {wallet.balances[0]?.[1] ?? "0 créditos"}
                  </p>
                </div>
              </section>

              <div id="configuracion" className="grid gap-5">
                <form action={updateProfile} className="rounded-lg border border-slate-200 p-4">
                  <h2 className="font-bold text-ink">Configuración básica</h2>
                  <div className="mt-4 grid gap-3">
                    <input
                      name="full_name"
                      defaultValue={profile.full_name ?? ""}
                      className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Nombre visible"
                    />
                    <input
                      name="location"
                      defaultValue={profile.location ?? ""}
                      className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Ubicación, por ejemplo Escazú"
                    />
                    <textarea
                      name="bio"
                      defaultValue={profile.bio ?? ""}
                      className="min-h-24 rounded-lg border border-slate-200 p-3 text-sm"
                      placeholder="Cuéntale a la comunidad qué sueles intercambiar."
                    />
                    <button className="min-h-12 rounded-lg bg-ocean-600 text-sm font-bold text-white hover:bg-ocean-500">
                      Guardar perfil
                    </button>
                  </div>
                </form>

                <form action={updateAccountPassword} className="rounded-lg border border-slate-200 p-4">
                  <h2 className="font-bold text-ink">Cambiar contraseña</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Usa una contraseña nueva de al menos 8 caracteres.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <input
                      name="password"
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Contraseña nueva"
                    />
                    <input
                      name="confirm_password"
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Confirmar contraseña nueva"
                    />
                    <button className="min-h-12 rounded-lg bg-leaf-600 text-sm font-bold text-white hover:bg-leaf-500">
                      Actualizar contraseña
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 p-3 hover:border-ocean-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </Link>
  );
}
