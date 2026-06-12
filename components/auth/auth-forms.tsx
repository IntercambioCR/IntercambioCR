"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Apple, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type AuthFormsProps = {
  configError: string | null;
  initialError?: string;
  initialOk?: string;
  supabaseInfo: {
    url: string;
    projectRef: string;
    anonKeyHint: string;
  };
};

type AuthDebug = {
  step: string;
  projectRef: string;
  email: string;
  signUpUserId?: string | null;
  signUpHasSession?: boolean;
  signUpIdentities?: number | null;
  signUpEmailConfirmedAt?: string | null;
  signUpError?: string | null;
  signInOk?: boolean;
  signInError?: string | null;
  adminUserExists?: boolean;
  adminCheckError?: string | null;
};

type AuthUserCheck = {
  exists?: boolean;
  error?: string;
};

type RuntimeDiagnostics = {
  clientUrl: string;
  clientProjectRef: string;
  clientAnonKeyHint: string;
  serverUrl?: string;
  serverProjectRef?: string;
  serverAnonKeyHint?: string;
  serverServiceKeyHint?: string;
  canListAuthUsers?: boolean;
  authUserCount?: number | null;
  authListError?: string | null;
};

function keyHint(value?: string) {
  if (!value) {
    return "sin-configurar";
  }

  return `${value.slice(0, 18)}...${value.slice(-6)}`;
}

function projectRefFromUrl(value?: string) {
  if (!value) {
    return "sin-configurar";
  }

  try {
    return new URL(value).hostname.split(".")[0] ?? "url-invalida";
  } catch {
    return "url-invalida";
  }
}

function formatAuthError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("fetch failed") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("eacces") ||
      message.includes("enotfound")
    ) {
      return "No se pudo conectar con Supabase. Revisa tu conexión, la URL del proyecto y que Supabase esté activo.";
    }

    return error.message;
  }

  if (typeof Event !== "undefined" && error instanceof Event) {
    return `Evento del navegador sin mensaje: ${error.type}. Revisa la consola para ver el origen exacto.`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function serializeAuthError(value: unknown) {
  if (value instanceof Error) {
    return Object.fromEntries(
      Object.getOwnPropertyNames(value).map((property) => [
        property,
        value[property as keyof Error]
      ])
    );
  }

  if (typeof Event !== "undefined" && value instanceof Event) {
    return {
      type: value.type,
      target: value.target instanceof Element ? value.target.tagName : String(value.target),
      currentTarget:
        value.currentTarget instanceof Element ? value.currentTarget.tagName : String(value.currentTarget),
      defaultPrevented: value.defaultPrevented,
      message: `Evento del navegador sin mensaje: ${value.type}`
    };
  }

  return value;
}

function signInAfterSignUpMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Supabase respondió: Email not confirmed. Para pruebas locales, revisa que Authentication > Providers > Email > Confirm email esté en OFF.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Supabase respondió: Invalid login credentials. Si el correo no aparece en Authentication > Users, el registro no se creó en este proyecto de Supabase.";
  }

  return `No se pudo iniciar sesión después del registro. Supabase respondió: ${message}`;
}

async function checkAuthUser(email: string, userId?: string | null) {
  const response = await fetch("/api/dev/auth-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, userId })
  });
  const text = await response.text();
  const result = (text ? JSON.parse(text) : {}) as AuthUserCheck;

  if (!response.ok) {
    return {
      exists: false,
      error: result.error ?? `${response.status} ${response.statusText}`
    };
  }

  return {
    exists: Boolean(result.exists),
    error: result.error ?? null
  };
}

export function AuthForms({ configError, initialError, initialOk, supabaseInfo }: AuthFormsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState(initialError ?? "");
  const [ok, setOk] = useState(initialOk ?? "");
  const [debug, setDebug] = useState<AuthDebug | null>(null);
  const [runtimeDiagnostics, setRuntimeDiagnostics] = useState<RuntimeDiagnostics>({
    clientUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "sin-configurar",
    clientProjectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clientAnonKeyHint: keyHint(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  });
  const [loading, setLoading] = useState<string | null>(null);
  const siteUrl = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const disabled = Boolean(configError || loading);

  useEffect(() => {
    async function loadDiagnostics() {
      const response = await fetch("/api/dev/supabase-diagnostics", { cache: "no-store" });
      const text = await response.text();
      const diagnostics = (text ? JSON.parse(text) : {}) as Partial<RuntimeDiagnostics>;
      const nextDiagnostics = {
        clientUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "sin-configurar",
        clientProjectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
        clientAnonKeyHint: keyHint(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        ...diagnostics,
        authListError: response.ok
          ? diagnostics.authListError
          : diagnostics.authListError ?? `${response.status} ${response.statusText}`
      };

      setRuntimeDiagnostics(nextDiagnostics);
      console.info("[Intercambio CR auth] runtime Supabase diagnostics", nextDiagnostics);
    }

    loadDiagnostics().catch((diagnosticsError: unknown) => {
      const nextDiagnostics = {
        clientUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "sin-configurar",
        clientProjectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
        clientAnonKeyHint: keyHint(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        authListError: formatAuthError(diagnosticsError)
      };

      setRuntimeDiagnostics(nextDiagnostics);
      console.info("[Intercambio CR auth] runtime Supabase diagnostics", nextDiagnostics);
    });
  }, []);

  function resetFeedback() {
    setError("");
    setOk("");
    setDebug(null);
  }

  async function saveLegalAcceptance(userId?: string | null) {
    if (!userId) {
      return;
    }

    await supabase
      .from("profiles")
      .update({
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        terms_version: "2026-06-11",
        privacy_version: "2026-06-11"
      })
      .eq("id", userId);
  }

  async function createTestAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setLoading("signup");

    try {
      if (configError) {
        throw new Error(configError);
      }

      const formData = new FormData(event.currentTarget);
      const fullName = String(formData.get("full_name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const acceptedTerms = formData.get("accepted_terms") === "on";

      if (!acceptedTerms) {
        throw new Error("Debes aceptar los Términos y condiciones y la Política de privacidad.");
      }

      if (password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            full_name: fullName || email
          }
        }
      });

      console.log("[Intercambio CR auth] supabase.auth.signUp raw response", {
        data,
        user: data.user,
        session: data.session,
        error: serializeAuthError(signUpError)
      });

      const nextDebug: AuthDebug = {
        step: "signUp",
        projectRef: supabaseInfo.projectRef,
        email,
        signUpUserId: data.user?.id ?? null,
        signUpHasSession: Boolean(data.session),
        signUpIdentities: data.user?.identities?.length ?? null,
        signUpEmailConfirmedAt: data.user?.email_confirmed_at ?? data.user?.confirmed_at ?? null,
        signUpError: signUpError?.message ?? null
      };

      setDebug(nextDebug);
      console.info("[Intercambio CR auth] signUp result", nextDebug);

      if (signUpError) {
        const adminCheck = await checkAuthUser(email, nextDebug.signUpUserId).catch((checkError: unknown) => ({
          exists: false,
          error: checkError instanceof Error ? checkError.message : "No se pudo revisar Auth desde el servidor."
        }));
        setDebug({
          ...nextDebug,
          adminUserExists: adminCheck.exists,
          adminCheckError: adminCheck.error
        });
        throw signUpError;
      }

      if (data.session) {
        const adminCheck = await checkAuthUser(email, data.user?.id ?? null).catch((checkError: unknown) => ({
          exists: false,
          error: checkError instanceof Error ? checkError.message : "No se pudo revisar Auth desde el servidor."
        }));
        setDebug({
          ...nextDebug,
          adminUserExists: adminCheck.exists,
          adminCheckError: adminCheck.error
        });
        if (!adminCheck.exists) {
          throw new Error(
            adminCheck.error ??
              "Supabase devolvió sesión, pero la verificación administrativa no encontró el usuario en Auth."
          );
        }
        await saveLegalAcceptance(data.user?.id);
        router.push("/perfil?ok=cuenta-creada");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      const signInDebug: AuthDebug = {
        ...nextDebug,
        step: "signIn after signUp",
        signInOk: !signInError,
        signInError: signInError?.message ?? null
      };
      const adminCheck = await checkAuthUser(email, data.user?.id ?? null).catch((checkError: unknown) => ({
        exists: false,
        error: checkError instanceof Error ? checkError.message : "No se pudo revisar Auth desde el servidor."
      }));
      signInDebug.adminUserExists = adminCheck.exists;
      signInDebug.adminCheckError = adminCheck.error;

      setDebug(signInDebug);
      console.info("[Intercambio CR auth] signIn after signUp result", signInDebug);

      if (!signInError) {
        if (!adminCheck.exists) {
          throw new Error(
            adminCheck.error ??
              "El login funcionó, pero la verificación administrativa no encontró el usuario en Auth."
          );
        }
        await saveLegalAcceptance(data.user?.id);
        router.push("/perfil?ok=cuenta-creada");
        router.refresh();
        return;
      }

      throw new Error(signInAfterSignUpMessage(signInError.message));
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setLoading("signin");

    try {
      if (configError) {
        throw new Error(configError);
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      const signInDebug: AuthDebug = {
        step: "signIn",
        projectRef: supabaseInfo.projectRef,
        email,
        signInOk: !signInError,
        signInError: signInError?.message ?? null
      };

      setDebug(signInDebug);
      console.info("[Intercambio CR auth] signIn result", signInDebug);

      if (signInError) {
        throw signInError;
      }

      router.push("/perfil");
      router.refresh();
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function signInWithMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setLoading("magic-link");

    try {
      if (configError) {
        throw new Error(configError);
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`
        }
      });

      if (otpError) {
        throw otpError;
      }

      router.push("/auth/revisar-correo?tipo=enlace");
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function recoverPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setLoading("recovery");

    try {
      if (configError) {
        throw new Error(configError);
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/nueva-contrasena`
      });

      if (resetError) {
        throw resetError;
      }

      router.push("/auth/revisar-correo?tipo=recuperacion");
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function signInWithProvider(provider: "google" | "apple") {
    resetFeedback();
    setLoading(provider);

    try {
      if (configError) {
        throw new Error(configError);
      }

      const { error: providerError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback`
        }
      });

      if (providerError) {
        throw providerError;
      }
    } catch (authError) {
      setError(formatAuthError(authError));
      setLoading(null);
    }
  }

  return (
    <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">Entrar a Intercambio CR</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Entra con tu correo y contraseña para probar publicaciones, mensajes, ofertas y credis.
        </p>

        {configError ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {configError}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            No se pudo completar la acción: {error}
          </div>
        ) : null}
        {ok === "cuenta-creada" ? (
          <div className="mt-4 rounded-lg border border-leaf-100 bg-leaf-50 p-3 text-sm font-semibold text-leaf-900">
            Cuenta creada correctamente.
          </div>
        ) : null}
        {debug ? (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            <p className="font-bold">Diagnóstico de autenticación</p>
            <p>Paso: {debug.step}</p>
            <p>Proyecto: {debug.projectRef}</p>
            <p className="break-all">Correo: {debug.email}</p>
            {typeof debug.signUpHasSession === "boolean" ? (
              <p>signUp devolvió sesión: {debug.signUpHasSession ? "sí" : "no"}</p>
            ) : null}
            {debug.signUpUserId ? <p className="break-all">Usuario devuelto: {debug.signUpUserId}</p> : null}
            {typeof debug.signUpIdentities === "number" ? <p>Identidades: {debug.signUpIdentities}</p> : null}
            {debug.signUpEmailConfirmedAt ? <p>Confirmado: {debug.signUpEmailConfirmedAt}</p> : null}
            {debug.signUpError ? <p>Error signUp: {debug.signUpError}</p> : null}
            {typeof debug.signInOk === "boolean" ? (
              <p>Login posterior: {debug.signInOk ? "correcto" : "falló"}</p>
            ) : null}
            {debug.signInError ? <p>Error real de login: {debug.signInError}</p> : null}
            {typeof debug.adminUserExists === "boolean" ? (
              <p>Existe en Supabase Auth: {debug.adminUserExists ? "sí" : "no"}</p>
            ) : null}
            {debug.adminCheckError ? <p>Revisión Auth servidor: {debug.adminCheckError}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <p className="font-bold text-ink">Conexión Supabase</p>
          <p>Proyecto: {supabaseInfo.projectRef}</p>
          <p className="break-all">URL: {supabaseInfo.url}</p>
          <p>Clave pública: {supabaseInfo.anonKeyHint}</p>
          <div className="mt-2 border-t border-slate-200 pt-2">
            <p className="font-bold text-ink">Runtime navegador</p>
            <p>Proyecto: {runtimeDiagnostics.clientProjectRef}</p>
            <p className="break-all">URL: {runtimeDiagnostics.clientUrl}</p>
            <p>Clave pública: {runtimeDiagnostics.clientAnonKeyHint}</p>
          </div>
          <div className="mt-2 border-t border-slate-200 pt-2">
            <p className="font-bold text-ink">Runtime servidor</p>
            <p>Proyecto: {runtimeDiagnostics.serverProjectRef ?? "cargando"}</p>
            <p className="break-all">URL: {runtimeDiagnostics.serverUrl ?? "cargando"}</p>
            <p>Clave pública: {runtimeDiagnostics.serverAnonKeyHint ?? "cargando"}</p>
            <p>Clave privada: {runtimeDiagnostics.serverServiceKeyHint ?? "cargando"}</p>
            <p>Puede listar Auth Users: {runtimeDiagnostics.canListAuthUsers ? "sí" : "no"}</p>
            {runtimeDiagnostics.authListError ? <p>Error Auth admin: {runtimeDiagnostics.authListError}</p> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <form onSubmit={signIn} className="grid gap-3">
            <input
              name="email"
              required
              type="email"
              className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="correo@ejemplo.com"
            />
            <input
              name="password"
              required
              minLength={8}
              type="password"
              className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Contraseña"
            />
            <button
              type="submit"
              disabled={disabled}
              className="focus-ring h-12 rounded-lg bg-ocean-600 text-sm font-bold text-white hover:bg-ocean-500 disabled:cursor-wait disabled:opacity-70"
            >
              {loading === "signin" ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Opcional
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={signInWithMagicLink} className="grid gap-3">
            <input
              name="email"
              required
              type="email"
              className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="correo@ejemplo.com"
            />
            <button
              type="submit"
              disabled={disabled}
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            >
              <Mail className="h-4 w-4" />
              {loading === "magic-link" ? "Enviando enlace..." : "Continuar con enlace por correo"}
            </button>
          </form>

          <form onSubmit={recoverPassword} className="grid gap-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-semibold text-ink">Recuperar contraseña</p>
            <input
              name="email"
              required
              type="email"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              placeholder="correo@ejemplo.com"
            />
            <button
              type="submit"
              disabled={disabled}
              className="focus-ring h-11 rounded-lg border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            >
              {loading === "recovery" ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          <button
            type="button"
            disabled={disabled}
            onClick={() => signInWithProvider("google")}
            className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          >
            {loading === "google" ? "Conectando..." : "Continuar con Google"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => signInWithProvider("apple")}
            className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          >
            <Apple className="h-4 w-4" />
            {loading === "apple" ? "Conectando..." : "Continuar con Apple"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-bold text-ink">Crear cuenta de prueba</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Todas las cuentas nuevas quedan con rol <strong>user</strong>. El rol admin solo se asigna manualmente en Supabase.
        </p>
        <form onSubmit={createTestAccount} className="mt-5 grid gap-3">
          <input
            name="full_name"
            required
            className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Tu nombre"
          />
          <input
            name="email"
            required
            type="email"
            className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="correo@ejemplo.com"
          />
          <input
            name="password"
            required
            minLength={8}
            type="password"
            className="h-12 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Contraseña de 8 caracteres o más"
          />
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <input
              name="accepted_terms"
              required
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-leaf-600"
            />
            <span>
              Acepto los{" "}
              <Link className="font-semibold text-ocean-700 underline" href="/terminos">
                Términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link className="font-semibold text-ocean-700 underline" href="/privacidad">
                Política de privacidad
              </Link>
              .
            </span>
          </label>
          <button
            type="submit"
            disabled={disabled}
            className="focus-ring h-12 rounded-lg bg-leaf-600 text-sm font-bold text-white hover:bg-leaf-500 disabled:cursor-wait disabled:opacity-70"
          >
            {loading === "signup" ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
