import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import {
  isLocalPortOpen,
  startHomelabTunnel,
} from "./homelab-tunnel.mjs";

const root = process.cwd();

function loadEnv() {
  const merged = {};
  for (const name of [".env", ".env.local"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    Object.assign(merged, parse(fs.readFileSync(file, "utf8")));
  }
  return merged;
}

function databaseNeedsTunnel(databaseUrl) {
  if (!databaseUrl) return false;
  try {
    const u = new URL(databaseUrl.replace(/^postgres:/, "postgresql:"));
    const host = u.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

const env = loadEnv();
const databaseUrl = (env.DATABASE_URL ?? "").trim();
const localPort = Number(env.WSP_LOCAL_PORT ?? "5433");
const needsTunnel = databaseNeedsTunnel(databaseUrl);

let tunnel = null;

async function ensureTunnel() {
  if (!needsTunnel) return;

  if (await isLocalPortOpen(localPort)) {
    console.log(
      `[dev] Puerto ${localPort} ya abierto — reutilizando túnel existente.`,
    );
    return;
  }

  const host = (env.HOMELAB_SSH_HOST ?? "192.168.40.50").trim();
  const user = (env.HOMELAB_SSH_USER ?? "drk000").trim();
  const password = (env.HOMELAB_SSH_PASSWORD ?? "").trim();
  const remoteHost = (env.WSP_PG_IP ?? "10.0.1.6").trim();
  const remotePort = Number(env.WSP_PG_PORT ?? "5432");

  if (!password) {
    console.error(
      "[dev] DATABASE_URL apunta a localhost pero falta HOMELAB_SSH_PASSWORD en .env.local",
    );
    console.error(
      "[dev] Copia HOMELAB_SSH_* desde tu homelab o usa https://wsp.drk000.dev",
    );
    process.exit(1);
  }

  console.log(
    `[dev] Abriendo túnel SSH -> 127.0.0.1:${localPort} (${remoteHost}:${remotePort})...`,
  );
  tunnel = await startHomelabTunnel({
    host,
    user,
    password,
    remoteHost,
    remotePort,
    localPort,
  });
  console.log(`[dev] Túnel listo en 127.0.0.1:${localPort}`);
}

function runNextDev() {
  const child = spawn("npx", ["next", "dev", "--webpack", "-p", "3000"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (tunnel) tunnel.close();
    process.exit(code ?? (signal ? 1 : 0));
  });
}

function shutdown() {
  if (tunnel) tunnel.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await ensureTunnel();
  runNextDev();
} catch (error) {
  console.error("[dev] No se pudo iniciar el túnel:", error);
  process.exit(1);
}
