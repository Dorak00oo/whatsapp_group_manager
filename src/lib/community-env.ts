import { parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Lee COMMUNITY_* leyendo el disco (.env / .env.local).
 * Así evitamos que Next/Turbopack deje `process.env.COMMUNITY_*` vacío en el bundle.
 */
export function getCommunityCredentialsFromEnv(): {
  email: string;
  password: string;
} {
  const root = process.cwd();
  const merged: Record<string, string> = {};

  for (const name of [".env", ".env.local"] as const) {
    const file = path.join(root, name);
    try {
      if (fs.existsSync(file)) {
        const parsed = parse(fs.readFileSync(file, "utf8"));
        Object.assign(merged, parsed);
      }
    } catch {
      /* ignore */
    }
  }

  const email = (
    merged.COMMUNITY_EMAIL ??
    process.env.COMMUNITY_EMAIL ??
    ""
  )
    .trim()
    .toLowerCase();

  const password = (
    merged.COMMUNITY_PASSWORD ?? process.env.COMMUNITY_PASSWORD ?? ""
  ).trim();

  return { email, password };
}
