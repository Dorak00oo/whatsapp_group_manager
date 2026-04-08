import { parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * `pg` hoy trata `require` / `prefer` / `verify-ca` como `verify-full`, pero en
 * pg v9 pasarán a semántica libpq (más débil para `require`). Neon y entornos
 * gestionados suelen ir bien con `verify-full` explícito.
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizeDatabaseUrlForPg(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("uselibpqcompat=true")) return trimmed;

  const legacySsl = new Set(["require", "prefer", "verify-ca"]);
  const wasPostgresScheme = /^postgres:\/\//i.test(trimmed);

  try {
    const forParse = trimmed.replace(/^postgres:\/\//i, "postgresql://");
    const u = new URL(forParse);
    if (u.protocol !== "postgresql:") return trimmed;

    const mode = u.searchParams.get("sslmode");
    if (!mode || !legacySsl.has(mode.toLowerCase())) return trimmed;

    u.searchParams.set("sslmode", "verify-full");
    let out = u.toString();
    if (wasPostgresScheme) {
      out = out.replace(/^postgresql:/, "postgres:");
    }
    return out;
  } catch {
    return trimmed;
  }
}

/**
 * Resuelve DATABASE_URL leyendo .env / .env.local del disco para que Prisma no
 * reciba URL vacía cuando Next/Turbopack sustituye process.env en el bundle.
 */
export function resolveDatabaseUrl(): string {
  const root = process.cwd();
  const merged: Record<string, string> = {};

  for (const name of [".env", ".env.local"] as const) {
    const file = path.join(root, name);
    try {
      if (fs.existsSync(file)) {
        Object.assign(merged, parse(fs.readFileSync(file, "utf8")));
      }
    } catch {
      /* ignore */
    }
  }

  const raw = (merged.DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
  return normalizeDatabaseUrlForPg(raw);
}
