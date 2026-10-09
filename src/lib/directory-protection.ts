import type { Prisma } from "@/generated/prisma";

/** Días que un alta nueva cuenta como activo permanente aunque no entre a Minecraft. */
export const NEW_MEMBER_PROTECTION_DAYS = 5;

export function newMemberProtectionUntil(createdAt: Date): Date {
  const until = new Date(createdAt.getTime());
  until.setUTCDate(until.getUTCDate() + NEW_MEMBER_PROTECTION_DAYS);
  return until;
}

type ProtectionFields = {
  permanentlyActive: boolean;
  permanentlyActiveUntil: Date | string | null;
};

export function hasTemporaryProtection(
  m: Pick<ProtectionFields, "permanentlyActiveUntil">,
  now: Date = new Date(),
): boolean {
  if (!m.permanentlyActiveUntil) return false;
  return new Date(m.permanentlyActiveUntil).getTime() > now.getTime();
}

/** Activo permanente manual o protección de nuevo vigente: la sync no lo baja a inactivo. */
export function isMemberProtected(m: ProtectionFields, now: Date = new Date()): boolean {
  return m.permanentlyActive || hasTemporaryProtection(m, now);
}

/** Insignia «Activo permanente · temporal»: no en salidos ni en permanente manual. */
export function shouldShowTemporaryProtectionChip(
  m: ProtectionFields & { leftAt: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (m.leftAt) return false;
  if (m.permanentlyActive) return false;
  return hasTemporaryProtection(m, now);
}

export function protectedMemberWhere(
  now: Date = new Date(),
): Prisma.DirectoryMemberWhereInput {
  return {
    OR: [{ permanentlyActive: true }, { permanentlyActiveUntil: { gt: now } }],
  };
}

export function unprotectedMemberWhere(
  now: Date = new Date(),
): Prisma.DirectoryMemberWhereInput {
  return {
    permanentlyActive: false,
    OR: [{ permanentlyActiveUntil: null }, { permanentlyActiveUntil: { lte: now } }],
  };
}
