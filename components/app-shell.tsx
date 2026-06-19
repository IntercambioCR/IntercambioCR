import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  CircleUserRound,
  Home,
  MessageCircle,
  Plus,
  Search,
  WalletCards
} from "lucide-react";
import { InstallPrompt } from "@/components/install-prompt";
import { MobileMenu } from "@/components/mobile-menu";
import { getUnreadActivityCount } from "@/lib/data/notifications";
import { isCurrentUserAdmin } from "@/lib/data/session";

const primaryNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Explorar" },
  { href: "/publicar", label: "Publicar" },
  { href: "/entregar", label: "Entregar" },
  { href: "/billetera", label: "Créditos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/mensajes", label: "Mensajes" },
  { href: "/perfil", label: "Mi perfil" }
];

const supportNavItems = [
  { href: "/seguridad", label: "Seguridad" },
  { href: "/reglas", label: "Reglas de intercambio" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" }
];

const bottomNavItems = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/explorar", label: "Explorar", Icon: Search },
  { href: "/publicar", label: "Publicar", Icon: Plus },
  { href: "/mensajes", label: "Mensajes", Icon: MessageCircle },
  { href: "/perfil", label: "Perfil", Icon: CircleUserRound }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [canSeeAdmin, unreadActivityCount] = await Promise.all([
    isCurrentUserAdmin(),
    getUnreadActivityCount()
  ]);
  const primaryItems = canSeeAdmin
    ? [...primaryNavItems, { href: "/admin", label: "Panel admin" }]
    : primaryNavItems;
  const mobileMenuItems = [...primaryItems, ...supportNavItems];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center">
            <Image
              src="/brand/intercambio-cr-logo.svg"
              alt="Intercambio CR"
              width={240}
              height={60}
              priority
              className="h-11 w-auto max-w-[12.5rem] sm:max-w-[15rem]"
            />
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 xl:flex">
            {primaryItems.slice(0, 8).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">
                Más
              </summary>
              <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-soft">
                {[...primaryItems.slice(8), ...supportNavItems].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <MobileMenu items={mobileMenuItems} />
            <Link
              href="/publicar"
              className="focus-ring hidden h-10 items-center gap-2 rounded-lg bg-leaf-600 px-3 text-sm font-semibold text-white hover:bg-leaf-500 sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Publicar
            </Link>
            <Link
              href="/billetera"
              className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Billetera"
            >
              <WalletCards className="h-5 w-5" />
            </Link>
            <Link
              href="/notificaciones"
              className="focus-ring relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadActivityCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
              ) : null}
            </Link>
            <Link
              href="/perfil"
              className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Perfil"
            >
              <CircleUserRound className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
      <InstallPrompt />
      <main className="min-w-0">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-5 text-[11px] font-medium text-slate-600">
          {bottomNavItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
