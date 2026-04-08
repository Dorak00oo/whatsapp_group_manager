import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

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
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const tokenId = session.user.id;
  if (tokenId) {
    const byId = await prisma.user.findUnique({
      where: { id: tokenId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  return null;
}
