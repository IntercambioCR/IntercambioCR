import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitMessage,
  rateLimitRetryAfterSeconds
} from "@/lib/security/rate-limit";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const clientIp = getClientIp(request.headers);
  const rateLimit = getPathRateLimit(pathname);

  if (rateLimit) {
    const result = checkRateLimit({
      key: `ip:${clientIp}:${rateLimit.name}`,
      limit: rateLimit.limit,
      windowMs: rateLimit.windowMs
    });

    if (!result.allowed) {
      const response = NextResponse.json(
        { error: rateLimitMessage() },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(rateLimitRetryAfterSeconds(result.resetAt)));
      return response;
    }
  }

  let response = NextResponse.next({
    request
  });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (isAdminPath(pathname)) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth";
        url.searchParams.set("error", "Inicia sesión para continuar.");
        return NextResponse.redirect(url);
      }

      const { data: isAdmin, error } = await supabase.rpc("is_admin");

      if (error || !isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "Acceso no autorizado.");
        return NextResponse.redirect(url);
      }
    }
  } catch (error) {
    console.error("Middleware Supabase falló.", error);

    if (isAdminPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "Acceso no autorizado.");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

function isAdminPath(pathname: string) {
  return [
    "/admin",
    "/dashboard",
    "/moderacion",
    "/reportes",
    "/usuarios",
    "/creditos-admin"
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getPathRateLimit(pathname: string) {
  if (pathname.startsWith("/auth")) {
    return { name: "auth-page", limit: 60, windowMs: 60_000 };
  }

  if (isAdminPath(pathname)) {
    return { name: "admin", limit: 120, windowMs: 60_000 };
  }

  return null;
}
