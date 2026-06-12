"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const PASSWORD = "Test123456!";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type ResultState = {
  data: unknown;
  user: unknown;
  session: unknown;
  error: unknown;
};

type UsersResultState = {
  data: unknown;
  error: unknown;
};

function serializeError(value: unknown) {
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

function serialize(value: unknown) {
  try {
    return JSON.stringify(serializeError(value), null, 2);
  } catch {
    return String(value);
  }
}

function projectRefFromUrl(value: string) {
  if (!value) {
    return "sin-configurar";
  }

  try {
    return new URL(value).hostname.split(".")[0] ?? "url-invalida";
  } catch {
    return "url-invalida";
  }
}

function keyHint(value: string) {
  if (!value) {
    return "sin-configurar";
  }

  return `${value.slice(0, 18)}...${value.slice(-6)}`;
}

export function DebugAuthClient() {
  const [result, setResult] = useState<ResultState | null>(null);
  const [usersResult, setUsersResult] = useState<UsersResultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const supabase = createClient();

  async function testSignUp() {
    setLoading(true);
    const email = `test+${Date.now()}@example.com`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: PASSWORD
      });

      console.log("[debug-auth] supabase.auth.signUp", {
        url: supabaseUrl,
        projectRef: projectRefFromUrl(supabaseUrl),
        anonKey: keyHint(anonKey),
        email,
        data,
        user: data.user,
        session: data.session,
        error
      });
      setResult({ data, user: data.user, session: data.session, error });
    } catch (error) {
      const normalizedError = serializeError(error);
      console.log("[debug-auth] supabase.auth.signUp thrown", {
        url: supabaseUrl,
        projectRef: projectRefFromUrl(supabaseUrl),
        anonKey: keyHint(anonKey),
        email,
        data: null,
        user: null,
        session: null,
        error: normalizedError
      });
      setResult({ data: null, user: null, session: null, error: normalizedError });
    } finally {
      setLoading(false);
    }
  }

  async function listAuthUsers() {
    setUsersLoading(true);

    try {
      const response = await fetch("/api/debug-auth/users", { cache: "no-store" });
      const text = await response.text();
      const body = text ? (JSON.parse(text) as UsersResultState) : { data: null, error: null };

      if (!response.ok) {
        const fetchError = {
          message: "La llamada para listar Auth Users falló.",
          status: response.status,
          statusText: response.statusText,
          body
        };

        console.log("[debug-auth] list Auth Users failed", fetchError);
        setUsersResult({ data: null, error: fetchError });
        return;
      }

      console.log("[debug-auth] list Auth Users", body);
      setUsersResult(body);
    } catch (error) {
      const normalizedError = serializeError(error);
      console.log("[debug-auth] list Auth Users thrown", { data: null, error: normalizedError });
      setUsersResult({ data: null, error: normalizedError });
    } finally {
      setUsersLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">Debug Auth</h1>
        <p className="mt-2 text-sm text-slate-600">
          Prueba mínima directa contra Supabase Auth. Solo ejecuta signUp.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          <p className="font-bold text-ink">Supabase usado por esta página</p>
          <p className="break-all">NEXT_PUBLIC_SUPABASE_URL: {supabaseUrl || "sin-configurar"}</p>
          <p>Project ref: {projectRefFromUrl(supabaseUrl)}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {keyHint(anonKey)}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={testSignUp}
            disabled={loading}
            className="h-11 rounded-lg bg-ocean-600 px-4 text-sm font-bold text-white hover:bg-ocean-500 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Probando..." : "Test SignUp real"}
          </button>
          <button
            type="button"
            onClick={listAuthUsers}
            disabled={usersLoading}
            className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-ink hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          >
            {usersLoading ? "Listando..." : "Listar Auth Users"}
          </button>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold text-ink">Resultado exacto de signUp</h2>
            <pre className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-white">
              {result
                ? `data\n${serialize(result.data)}\n\ndata.user\n${serialize(result.user)}\n\ndata.session\n${serialize(result.session)}\n\nerror\n${serialize(result.error)}`
                : "Sin resultado todavía."}
            </pre>
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Auth Users desde service role</h2>
            <pre className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-white">
              {usersResult
                ? `data\n${serialize(usersResult.data)}\n\nerror\n${serialize(usersResult.error)}`
                : "Sin resultado todavía."}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
