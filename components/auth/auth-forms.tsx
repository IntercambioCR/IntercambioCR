"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type AuthFormsProps = {
  configError: string | null;
  initialError?: string;
  initialOk?: string;
  nextPath?: string;
};

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
      return "No pudimos conectarnos en este momento. Intenta de nuevo más tarde.";
    }

    if (message.includes("invalid login credentials")) {
      return "Correo o contraseña inválidos.";
    }

    if (message.includes("email not confirmed")) {
      return "Tu correo aún no está confirmado.";
    }

    return "No pudimos completar la acción. Revisa los datos e intenta de nuevo.";
  }

  return "No pudimos completar la acción. Intenta de nuevo.";
}

function getSafeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/perfil";
  }

  return nextPath;
}

export function AuthForms({ configError, initialError, initialOk, nextPath }: AuthFormsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState(initialError ?? "");
  const [ok, setOk] = useState(initialOk ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const siteUrl = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const disabled = Boolean(configError || loading);
  const redirectTo = getSafeNextPath(nextPath);

  function resetFeedback() {
    setError("");
    setOk("");
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

  async function createAccount(event: FormEvent<HTMLFormElement>) {
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

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        await saveLegalAcceptance(data.user?.id);
        router.push(redirectTo === "/perfil" ? "/perfil?ok=cuenta-creada" : redirectTo);
        router.refresh();
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setOk("Cuenta creada correctamente. Ya puedes iniciar sesión.");
        return;
      }

      await saveLegalAcceptance(signInData.user?.id ?? data.user?.id);
      router.push(redirectTo === "/perfil" ? "/perfil?ok=cuenta-creada" : redirectTo);
      router.refresh();
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

      if (signInError) {
        throw signInError;
      }

      router.push(redirectTo);
      router.refresh();
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
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/nueva-contrasena`
      });

      if (recoveryError) {
        throw recoveryError;
      }

      router.push("/auth/revisar-correo?tipo=recuperacion");
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">Entrar a Intercambio CR</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Usa tu cuenta para publicar, hacer ofertas, conversar y administrar tus créditos.
        </p>

        {configError ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            El inicio de sesión no está disponible temporalmente.
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="mt-4 rounded-lg border border-leaf-100 bg-leaf-50 p-3 text-sm font-semibold text-leaf-900">
            {ok}
          </div>
        ) : null}

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
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-bold text-ink">Crear cuenta</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Crea tu perfil para publicar artículos, recibir ofertas y participar en la comunidad.
        </p>
        <form onSubmit={createAccount} className="mt-5 grid gap-3">
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
