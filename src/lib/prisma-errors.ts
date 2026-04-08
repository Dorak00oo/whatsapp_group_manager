/** Prisma P1001 — no hay conexión al servidor de base de datos (Neon caído, en pausa, red, etc.). */
export function isDatabaseUnreachableError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const o = e as { code?: string };
  if (o.code === "P1001") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Can't reach database") ||
    msg.includes("DatabaseNotReachable") ||
    msg.includes("P1001")
  );
}
