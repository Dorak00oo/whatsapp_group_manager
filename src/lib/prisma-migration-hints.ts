/** Texto cuando la BD no tiene la migración de `display_name` (columna nullable). */
export const MISSING_DISPLAY_NAME_COLUMN_MESSAGE =
  "La base de datos no está al día: falta la columna display_name en directory_members. " +
  "En la carpeta del proyecto, con DATABASE_URL apuntando a la misma base que usa la app (Neon), ejecuta: npx prisma migrate deploy. " +
  "En Vercel, usa como Build Command: npx prisma migrate deploy && npm run build. " +
  "El nombre es opcional en el Excel y en el formulario, pero la columna en PostgreSQL debe existir (puede ir vacía).";

export function isMissingDisplayNameColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    /display_name/i.test(msg) &&
    (/does not exist/i.test(msg) || /Unknown column/i.test(msg))
  );
}
