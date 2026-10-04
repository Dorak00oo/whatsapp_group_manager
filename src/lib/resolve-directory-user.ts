import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";

/**
 * El JWT puede conservar un `user.id` antiguo tras resetear la BD o cambiar
 * DATABASE_URL; ese id ya no existe en `users` y rompe el FK al crear miembros.
 * Priorizamos el usuario actual en BD por email (único en Credentials).
 */
export async function resolveDirectoryUserId(
  session: Session | null,
): Promise<string | null> {
  if (!session?.user) return null;

  const email = session.user.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await withDbRetry(() =>
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    );
    if (byEmail) return byEmail.id;
  }

  const tokenId = session.user.id;
  if (tokenId) {
    const byId = await withDbRetry(() =>
      prisma.user.findUnique({ where: { id: tokenId }, select: { id: true } }),
    );
    if (byId) return byId.id;
  }

  return null;
}

/**
 * Dueño interno de los datos. Si `COMMUNITY_EMAIL` está definido, esa fila.
 * Si no, la que ya tiene el directorio (o la única que exista). El correo no
 * se usa para entrar.
 */
export async function findCommunityOwner(): Promise<{ id: string; email: string } | null> {
  const { getCommunityCredentialsFromEnv } = await import("@/lib/community-env");
  const email = getCommunityCredentialsFromEnv().email;
  if (email) {
    const byEmail = await withDbRetry(() =>
      prisma.user.findUnique({ where: { email }, select: { id: true, email: true } }),
    );
    if (byEmail) return byEmail;
  }
  const withMembers = await withDbRetry(() =>
    prisma.user.findFirst({
      where: { directoryMembers: { some: {} } },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    }),
  );
  if (withMembers) return withMembers;
  return withDbRetry(() =>
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    }),
  );
}

/**
 * User comunitario (`COMMUNITY_EMAIL`): dueño interno de todo el directorio.
 * Se crea en el primer login; la columna del hash es obligatoria pero nadie
 * entra con ella, así que guarda el hash de un valor aleatorio.
 */
export async function ensureCommunityUser(
  email: string,
): Promise<{ id: string; email: string }> {
  const existing = await withDbRetry(() =>
    prisma.user.findUnique({ where: { email }, select: { id: true, email: true } }),
  );
  if (existing) return existing;

  const bcrypt = await import("bcryptjs");
  const { randomUUID } = await import("node:crypto");
  const passwordHash = await bcrypt.hash(randomUUID(), 12);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: process.env.COMMUNITY_DISPLAY_NAME?.trim() || "Comunidad",
    },
    select: { id: true, email: true },
  });
}
