"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { authLog } from "@/lib/auth-log";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  authLog("server action: intento de login", {
    emailLen: email.length,
    passwordLen: password.length,
  });

  try {
    // redirect: false evita que Auth.js redirija a AUTH_URL (puede ser un dominio viejo
    // en Coolify). Luego Next hace redirect relativo al host desde el que entraste.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (
      (typeof result === "string" && /[?&]error=/.test(result)) ||
      (result && typeof result === "object" && "error" in result && result.error)
    ) {
      authLog("server action: Auth.js rechazó el login", { result });
      return { error: "Email o contraseña incorrectos" };
    }

    authLog("server action: login OK — redirect relativo a /dashboard");
    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      authLog("server action: Auth.js rechazó el login", {
        type: error.type,
        message: error.message,
      });
      return { error: "Email o contraseña incorrectos" };
    }
    const err = error as Error;
    console.error("[login-auth] server action: error inesperado", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
    });
    return { error: "No se pudo iniciar sesión. Revisa la consola del servidor." };
  }
}
