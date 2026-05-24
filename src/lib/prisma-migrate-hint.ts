export const MINECRAFT_SYNC_QUEUE_MIGRATE_HINT =
  "Ejecuta en el proyecto whatsapp: npx prisma migrate deploy (falta la tabla minecraft_sync_queue en esta base de datos).";

export function isPrismaMissingTableError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2021"
  );
}
