import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { resolveDatabaseUrl } from "@/lib/database-url";
import { authLog } from "@/lib/auth-log";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        authLog("authorize: inicio");

        const { getCommunityCredentialsFromEnv } = await import(
          "@/lib/community-env"
        );
        const { email: expectedEmail, password: expectedPassword } =
          getCommunityCredentialsFromEnv();

        if (!expectedEmail || !expectedPassword) {
          authLog("authorize: FALLO — COMMUNITY_EMAIL o COMMUNITY_PASSWORD vacíos tras leer .env", {
            expectedEmailLen: expectedEmail.length,
            expectedPassLen: expectedPassword.length,
            hint: "Revisa .env en la raíz del proyecto y reinicia el servidor",
          });
          return null;
        }

        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;

        authLog("authorize: comparación (solo longitudes, sin secretos)", {
          expectedEmailLen: expectedEmail.length,
          expectedPassLen: expectedPassword.length,
          submittedEmailLen: email?.length ?? 0,
          submittedPassLen: password?.length ?? 0,
          hasCredentialsObject: credentials != null,
          credentialKeys:
            credentials && typeof credentials === "object"
              ? Object.keys(credentials as object)
              : [],
        });

        if (!email || password === undefined || password === "") {
          authLog("authorize: FALLO — email o contraseña vacíos en el formulario");
          return null;
        }

        if (email !== expectedEmail) {
          authLog("authorize: FALLO — el email no coincide con COMMUNITY_EMAIL", {
            mismoDominio: email.split("@")[1] === expectedEmail.split("@")[1],
          });
          return null;
        }

        if (password !== expectedPassword) {
          authLog("authorize: FALLO — la contraseña no coincide con COMMUNITY_PASSWORD (mayúsculas/minúsculas y espacios cuentan)");
          return null;
        }

        try {
          const { prisma } = await import("@/lib/prisma");
          const bcrypt = await import("bcryptjs");

          let user = await prisma.user.findUnique({
            where: { email: expectedEmail },
          });

          if (!user) {
            authLog("authorize: creando usuario en BD (primer acceso)");
            const passwordHash = await bcrypt.hash(expectedPassword, 12);
            user = await prisma.user.create({
              data: {
                email: expectedEmail,
                passwordHash,
                name: process.env.COMMUNITY_DISPLAY_NAME?.trim() || "Comunidad",
              },
            });
          }

          authLog("authorize: OK — sesión permitida", { userId: user.id });
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "Comunidad",
          };
        } catch (e) {
          const err = e as Error;
          const hasUrl = Boolean(resolveDatabaseUrl());
          console.error("[login-auth] authorize: FALLO — Prisma/BD", {
            name: err?.name,
            message: err?.message,
            databaseUrlResolved: hasUrl,
          });
          authLog(
            hasUrl
              ? "authorize: FALLO — error al hablar con la BD (Neon dormida, red o URL)"
              : "authorize: FALLO — DATABASE_URL vacía: revisa .env en la raíz del proyecto",
          );
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
