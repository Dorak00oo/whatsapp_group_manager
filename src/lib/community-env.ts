import { parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PANEL_OWNER_GAMERTAG } from "@/lib/panel-credentials";

const FILE_CACHE_MS = 5_000;
let fileCache: { at: number; values: Record<string, string> } | null = null;

/**
 * Lee `.env` / `.env.local` del disco (caché corta: el callback de sesión
 * corre en cada request). Así evitamos que Next/Turbopack deje
 * `process.env.COMMUNITY_*` vacío en el bundle.
 */
function readEnvFiles(): Record<string, string> {
  const now = Date.now();
  if (fileCache && now - fileCache.at < FILE_CACHE_MS) return fileCache.values;

  const merged: Record<string, string> = {};
  for (const name of [".env", ".env.local"] as const) {
    const file = path.join(/* turbopackIgnore: true */ process.cwd(), name);
    try {
      if (fs.existsSync(file)) {
        Object.assign(merged, parse(fs.readFileSync(file, "utf8")));
      }
    } catch {
      /* ignore */
    }
  }
  fileCache = { at: now, values: merged };
  return merged;
}

function envValue(name: string): string {
  return (readEnvFiles()[name] ?? process.env[name] ?? "").trim();
}

/**
 * `COMMUNITY_EMAIL` ya no sirve para entrar: identifica al User dueño interno
 * de los datos. `COMMUNITY_PASSWORD` es la contraseña grupal de las cuentas.
 */
export function getCommunityCredentialsFromEnv(): {
  email: string;
  password: string;
} {
  return {
    email: envValue("COMMUNITY_EMAIL").toLowerCase(),
    password: envValue("COMMUNITY_PASSWORD"),
  };
}

export type PanelAuthEnv = {
  communityEmail: string;
  groupPassword: string;
  ownerGamertag: string;
  ownerPassword: string;
};

export function getPanelAuthEnv(): PanelAuthEnv {
  const { email, password } = getCommunityCredentialsFromEnv();
  return {
    communityEmail: email,
    groupPassword: password,
    ownerGamertag: envValue("PANEL_OWNER_GAMERTAG") || DEFAULT_PANEL_OWNER_GAMERTAG,
    ownerPassword: envValue("PANEL_OWNER_PASSWORD"),
  };
}
