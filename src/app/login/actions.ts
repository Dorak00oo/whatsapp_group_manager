"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authLog } from "@/lib/auth-log";
import {
  clientIpFromHeaders,
  describeLoginWait,
  getLoginRateLimiter,
} from "@/lib/login-rate-limit";
import { gamertagKey } from "@/lib/panel-credentials";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const WRONG_CREDENTIALS = "Gamertag o contraseña incorrectos.";
const DATABASE_UNAVAILABLE =
  "No se pudo conectar a la base de datos. En desarrollo local abre el túnel SSH (scripts/homelab-db-tunnel.ps1) y usa DATABASE_URL con 127.0.0.1:5433 en .env.local. Reinicia npm run dev.";

function blockedMessage(retryAfterMs: number): string {
  return `Demasiados intentos fallidos. Espera ${describeLoginWait(retryAfterMs)} y vuelve a intentar.`;
}

/** Auth.js envuelve lo que lanza `authorize` en `CallbackRouteError` (`cause.err`). */
function isDatabaseUnavailable(error: unknown): boolean {
  const e = error as { message?: unknown; cause?: { err?: { message?: unknown } } } | null;
  return (
    e?.message === "DATABASE_UNAVAILABLE" ||
    e?.cause?.err?.message === "DATABASE_UNAVAILABLE"
  );
}

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const gamertag = String(formData.get("gamertag") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  authLog("server action: intento de login", {
    gamertagLen: gamertag.length,
    passwordLen: password.length,
  });

  const ip = clientIpFromHeaders(await headers());
  const key = gamertagKey(gamertag);
  const limiter = getLoginRateLimiter();
  const before = limiter.check(ip, key);
  if (before.blocked) return { error: blockedMessage(before.retryAfterMs) };

  const rejected = () => {
    const after = limiter.check(ip, key);
    return { error: after.blocked ? blockedMessage(after.retryAfterMs) : WRONG_CREDENTIALS };
  };

  try {
    // redirect: false evita que Auth.js redirija a AUTH_URL (puede ser un dominio viejo
    // en Coolify). Luego Next hace redirect relativo al host desde el que entraste.
    const result = await signIn("credentials", {
      gamertag,
      password,
      redirect: false,
    });

    if (
      (typeof result === "string" && /[?&]error=/.test(result)) ||
      (result && typeof result === "object" && "error" in result && result.error)
    ) {
      authLog("server action: Auth.js rechazó el login", { result });
      return rejected();
    }

    authLog("server action: login OK — redirect relativo a /dashboard");
    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (isDatabaseUnavailable(error)) {
      return { error: DATABASE_UNAVAILABLE };
    }
    if (error instanceof AuthError) {
      authLog("server action: Auth.js rechazó el login", {
        type: error.type,
        message: error.message,
      });
      return rejected();
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
