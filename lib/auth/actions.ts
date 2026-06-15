"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseConfigError } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectAuthError(message: string): never {
  redirect(`/auth?error=${encodeURIComponent(message)}`);
}

function redirectProfileError(message: string): never {
  redirect(`/perfil?error=${encodeURIComponent(message)}`);
}

function friendlyProfileError(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : "";

  if (rawMessage) {
    const message = rawMessage.toLowerCase();

    if (
      message.includes("bucket not found") ||
      message.includes("storage") ||
      message.includes("object not found") ||
      message.includes("row-level security") ||
      message.includes("violates row-level security")
    ) {
      return "No fue posible subir la foto. Inténtalo nuevamente.";
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("bucket not found") ||
      message.includes("storage") ||
      message.includes("object not found")
    ) {
      return "No fue posible subir la foto. Inténtalo nuevamente.";
    }

    if (
      message.includes("fetch failed") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("eacces") ||
      message.includes("enotfound")
    ) {
      return "No pudimos conectarnos en este momento. Inténtalo nuevamente.";
    }
  }

  return "No se pudo actualizar el perfil. Inténtalo nuevamente.";
}

function readableAuthError(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.toLowerCase().includes("fetch failed") ||
      error.message.toLowerCase().includes("failed to fetch") ||
      error.message.toLowerCase().includes("eacces") ||
      error.message.toLowerCase().includes("enotfound")
    ) {
      return "No se pudo conectar con Supabase. Revisa tu conexión, la URL del proyecto y que el proyecto de Supabase esté activo.";
    }

    return error.message;
  }

  return "No se pudo completar la acción. Intenta de nuevo.";
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

async function runAuthRequest<T>(request: () => PromiseLike<T>) {
  const configError = getSupabaseConfigError();

  if (configError) {
    redirectAuthError(configError);
  }

  try {
    return await request();
  } catch (error) {
    redirectAuthError(readableAuthError(error));
  }
}

async function getAuthClient() {
  const configError = getSupabaseConfigError();

  if (configError) {
    redirectAuthError(configError);
  }

  try {
    return await createClient();
  } catch (error) {
    redirectAuthError(readableAuthError(error));
  }
}

export async function signInWithEmail(formData: FormData) {
  const email = getString(formData, "email");
  const supabase = await getAuthClient();
  const { error } = await runAuthRequest(() =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`
      }
    })
  );

  if (error) {
    redirectAuthError(error.message);
  }

  redirect("/auth/revisar-correo");
}

export async function resetPasswordForEmail(formData: FormData) {
  const email = getString(formData, "email");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await getAuthClient();

  const { error } = await runAuthRequest(() =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/nueva-contrasena`
    })
  );

  if (error) {
    redirectAuthError(error.message);
  }

  redirect("/auth/revisar-correo?tipo=recuperacion");
}

export async function signUpWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");

  if (password.length < 8) {
    redirectAuthError("La contraseña debe tener al menos 8 caracteres.");
  }

  const supabase = await getAuthClient();
  const { data, error } = await runAuthRequest(() =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
        data: {
          full_name: fullName || email
        }
      }
    })
  );

  console.log("[Intercambio CR auth action] supabase.auth.signUp raw response", {
    data,
    user: data.user,
    session: data.session,
    error: serializeAuthError(error)
  });

  if (error) {
    redirectAuthError(error.message);
  }

  const user = data.user;
  const emailConfirmedAt = user?.email_confirmed_at ?? user?.confirmed_at ?? null;

  if (data.session) {
    revalidatePath("/perfil");
    redirect("/perfil?ok=cuenta-creada");
  }

  if (user && emailConfirmedAt) {
    const { error: signInError } = await runAuthRequest(() =>
      supabase.auth.signInWithPassword({
        email,
        password
      })
    );

    if (!signInError) {
      revalidatePath("/perfil");
      redirect("/perfil?ok=cuenta-creada");
    }
  }

  if (user) {
    const { error: signInError } = await runAuthRequest(() =>
      supabase.auth.signInWithPassword({
        email,
        password
      })
    );

    if (!signInError) {
      revalidatePath("/perfil");
      redirect("/perfil?ok=cuenta-creada");
    }

    redirectAuthError(signInAfterSignUpMessage(signInError.message));
  }

  redirect("/auth/revisar-correo?tipo=registro");
}

export async function signInWithPassword(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const supabase = await getAuthClient();

  const { error } = await runAuthRequest(() =>
    supabase.auth.signInWithPassword({
      email,
      password
    })
  );

  if (error) {
    redirectAuthError(error.message);
  }

  redirect("/perfil");
}

export async function signInWithProvider(formData: FormData) {
  const provider = getString(formData, "provider");

  if (provider !== "google" && provider !== "apple") {
    redirectAuthError("Proveedor no soportado.");
  }

  const supabase = await getAuthClient();
  const { data, error } = await runAuthRequest(() =>
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`
      }
    })
  );

  if (error) {
    redirectAuthError(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await getAuthClient();
  await runAuthRequest(() => supabase.auth.signOut());
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await getAuthClient();
  const {
    data: { user }
  } = await runAuthRequest(() => supabase.auth.getUser());

  if (!user) {
    redirect("/auth");
  }

  const payload = {
    full_name: getString(formData, "full_name") || null,
    location: getString(formData, "location") || null,
    bio: getString(formData, "bio") || null
  };

  const { error } = await runAuthRequest(() =>
    supabase.from("profiles").update(payload).eq("id", user.id)
  );

  if (error) {
    redirectProfileError("No se pudo guardar el perfil. Inténtalo nuevamente.");
  }

  revalidatePath("/perfil");
  redirect("/perfil?ok=perfil");
}

export async function updateAvatar(formData: FormData) {
  const supabase = await getAuthClient();
  const {
    data: { user }
  } = await runAuthRequest(() => supabase.auth.getUser());

  if (!user) {
    redirect("/auth");
  }

  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    redirectProfileError("Selecciona una imagen para tu perfil.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = 3 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    redirectProfileError("Solo se permiten imágenes JPG, PNG o WebP.");
  }

  if (file.size > maxBytes) {
    redirectProfileError("La foto de perfil debe pesar 3 MB o menos.");
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  const extension = extensionByType[file.type] ?? "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;
  const bucket = "avatars";

  const { error: uploadError } = await runAuthRequest(() =>
    supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    })
  );

  if (uploadError) {
    console.error("[Intercambio CR updateAvatar upload error]", {
      table: "storage.objects",
      bucket,
      path,
      firstFolder: path.split("/")[0],
      userId: user.id,
      fileType: file.type,
      fileSize: file.size,
      message: "message" in uploadError ? uploadError.message : String(uploadError)
    });
    redirectProfileError(friendlyProfileError(uploadError));
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(path);

  const { error: profileError } = await runAuthRequest(() =>
    supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)
  );

  if (profileError) {
    console.error("[Intercambio CR updateAvatar profile error]", {
      table: "profiles",
      bucket,
      path,
      userId: user.id,
      publicUrl,
      message: "message" in profileError ? profileError.message : String(profileError)
    });
    await supabase.storage.from(bucket).remove([path]);
    redirectProfileError("No se pudo actualizar la foto en tu perfil. Inténtalo nuevamente.");
  }

  revalidatePath("/perfil");
  redirect("/perfil?ok=avatar");
}

export async function updateAccountPassword(formData: FormData) {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirm_password");

  if (password.length < 8) {
    redirectProfileError("La contraseña debe tener al menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    redirectProfileError("Las contraseñas no coinciden.");
  }

  const supabase = await getAuthClient();
  const {
    data: { user }
  } = await runAuthRequest(() => supabase.auth.getUser());

  if (!user) {
    redirect("/auth?redirect=/perfil&error=Inicia%20sesi%C3%B3n%20para%20cambiar%20tu%20contrase%C3%B1a.");
  }

  const { error } = await runAuthRequest(() => supabase.auth.updateUser({ password }));

  if (error) {
    redirectProfileError("No se pudo actualizar la contraseña. Inténtalo de nuevo.");
  }

  revalidatePath("/perfil");
  redirect("/perfil?ok=contrasena");
}

export async function updatePassword(formData: FormData) {
  const password = getString(formData, "password");

  if (password.length < 8) {
    redirect("/auth/nueva-contrasena?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%208%20caracteres");
  }

  const supabase = await getAuthClient();
  const {
    data: { user }
  } = await runAuthRequest(() => supabase.auth.getUser());

  if (!user) {
    redirect("/auth?error=El%20enlace%20de%20recuperaci%C3%B3n%20expir%C3%B3%20o%20no%20es%20v%C3%A1lido");
  }

  const { error } = await runAuthRequest(() => supabase.auth.updateUser({ password }));

  if (error) {
    redirect(`/auth/nueva-contrasena?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/perfil?ok=contrasena");
}
