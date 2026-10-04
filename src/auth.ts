import NextAuth, { CredentialsSignin, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { authLog } from "@/lib/auth-log";

class LoginRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Gamertag con `PanelAccount` + contraseña grupal (`COMMUNITY_PASSWORD`), o el
 * dueño (`PANEL_OWNER_GAMERTAG`) + `PANEL_OWNER_PASSWORD`. El límite de
 * intentos vive aquí para cubrir también un POST directo a /api/auth.
 */
async function authorizePanelLogin(
  credentials: Partial<Record<string, unknown>>,
  request: Request,
): Promise<User | null> {
  const { getPanelAuthEnv } = await import("@/lib/community-env");
  const { decidePanelLogin, gamertagKey, passwordFingerprint, rejectCountsAsFailure } =
    await import("@/lib/panel-credentials");
  const { clientIpFromHeaders, getLoginRateLimiter } = await import(
    "@/lib/login-rate-limit"
  );

  const gamertag =
    typeof credentials.gamertag === "string" ? credentials.gamertag.trim() : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";
  const ip = clientIpFromHeaders(request.headers);
  const key = gamertagKey(gamertag);
  const limiter = getLoginRateLimiter();

  authLog("authorize: inicio", {
    gamertagLen: gamertag.length,
    passwordLen: password.length,
    hasIp: ip !== null,
  });

  if (limiter.check(ip, key).blocked) {
    authLog("authorize: bloqueado por intentos fallidos");
    throw new LoginRateLimited();
  }

  const env = getPanelAuthEnv();
  const decision = decidePanelLogin({ gamertag, password }, env);
  if (decision.kind === "reject") {
    if (decision.reason === "owner-password-unset") {
      console.error(
        `[login-auth] PANEL_OWNER_PASSWORD no está definida: ${env.ownerGamertag} no puede entrar. Defínela en el entorno y reinicia el panel.`,
      );
    } else if (decision.reason === "group-password-unset") {
      console.error(
        "[login-auth] COMMUNITY_PASSWORD vacía: las cuentas de admin no pueden entrar.",
      );
    }
    if (rejectCountsAsFailure(decision.reason)) limiter.recordFailure(ip, key);
    authLog("authorize: rechazado", { reason: decision.reason });
    return null;
  }

  try {
    const { findCommunityOwner } = await import("@/lib/resolve-directory-user");
    const owner = await findCommunityOwner();
    if (!owner) {
      console.error(
        "[login-auth] No hay un usuario dueño de los datos en la base. Nadie puede entrar.",
      );
      return null;
    }

    if (decision.kind === "owner") {
      limiter.recordSuccess(ip, key);
      authLog("authorize: OK — dueño del panel");
      return {
        id: owner.id,
        email: owner.email,
        name: decision.gamertag,
        gamertag: decision.gamertag,
        isPanelOwner: true,
        accountId: null,
        credentialKey: passwordFingerprint(env.ownerPassword),
      };
    }

    const { findPanelAccountForLogin } = await import("@/lib/panel-accounts");
    const account = await findPanelAccountForLogin(owner.id, decision.gamertagKey);
    if (!account) {
      limiter.recordFailure(ip, key);
      authLog("authorize: rechazado — el gamertag no tiene cuenta del panel");
      return null;
    }
    limiter.recordSuccess(ip, key);
    authLog("authorize: OK — cuenta de admin");
    return {
      id: owner.id,
      email: owner.email,
      name: account.gamertag,
      gamertag: account.gamertag,
      isPanelOwner: false,
      accountId: account.id,
      credentialKey: passwordFingerprint(env.groupPassword),
    };
  } catch (e) {
    const err = e as Error;
    const { resolveDatabaseUrl } = await import("@/lib/database-url");
    const hasUrl = Boolean(resolveDatabaseUrl());
    console.error("[login-auth] authorize: FALLO — Prisma/BD", {
      name: err?.name,
      message: err?.message,
      databaseUrlResolved: hasUrl,
    });
    throw new Error("DATABASE_UNAVAILABLE");
  }
}

/**
 * Corre en cada `auth()` (proxy, layouts, páginas, actions, APIs): la sesión
 * deja de valer en el siguiente request si quitan la cuenta o cambia la
 * contraseña con la que se entró. Tokens anteriores al login por gamertag
 * no traen `gamertag` y obligan a entrar de nuevo.
 */
async function validatePanelToken(token: JWT): Promise<JWT | null> {
  if (!token.id || !token.gamertag || !token.credentialKey) return null;

  const { getPanelAuthEnv } = await import("@/lib/community-env");
  const { isPanelOwnerGamertag, passwordFingerprint } = await import(
    "@/lib/panel-credentials"
  );
  const env = getPanelAuthEnv();

  if (token.isPanelOwner) {
    const ok =
      isPanelOwnerGamertag(token.gamertag, env.ownerGamertag) &&
      env.ownerPassword !== "" &&
      token.credentialKey === passwordFingerprint(env.ownerPassword);
    return ok ? token : null;
  }

  if (!token.accountId) return null;
  if (!env.groupPassword || token.credentialKey !== passwordFingerprint(env.groupPassword)) {
    return null;
  }
  const { checkPanelAccountSession } = await import("@/lib/panel-accounts");
  const check = await checkPanelAccountSession(token.accountId, token.id);
  if (check.status === "invalid") return null;
  if (check.status === "valid" && check.gamertag !== token.gamertag) {
    token.gamertag = check.gamertag;
    token.name = check.gamertag;
  }
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        gamertag: { label: "Gamertag", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: (credentials, request) =>
        authorizePanelLogin(credentials ?? {}, request),
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.gamertag = user.gamertag;
        token.isPanelOwner = user.isPanelOwner === true;
        token.accountId = user.accountId ?? null;
        token.credentialKey = user.credentialKey;
        return token;
      }
      return validatePanelToken(token);
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.gamertag = token.gamertag ?? "";
        session.user.isPanelOwner = token.isPanelOwner === true;
        if (token.gamertag) session.user.name = token.gamertag;
      }
      return session;
    },
  },
});
