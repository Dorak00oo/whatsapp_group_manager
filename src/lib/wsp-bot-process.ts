import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {
  coolifyApiToken,
  coolifyApiUrl,
  isLoopbackControlUrl,
  type WspBotProcessInfo,
  usesCoolifyBotControl,
  wspBotControlUrl,
  wspBotCoolifyUuid,
} from "@/lib/wsp-bot-console";

export type WspBotProcessResult =
  | { ok: true; message: string; process: WspBotProcessInfo }
  | { ok: false; error: string; process: WspBotProcessInfo };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function wspBotRoot(): string {
  if (usesCoolifyBotControl()) {
    return `coolify:${wspBotCoolifyUuid()}`;
  }
  const fromEnv = process.env.WSP_BOT_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "..", "WspBot");
}

export function wspBotControlPort(): number {
  try {
    const port = Number(new URL(wspBotControlUrl()).port);
    return port > 0 ? port : 3010;
  } catch {
    return 3010;
  }
}

export function wspBotControlHost(): string {
  try {
    return new URL(wspBotControlUrl()).hostname || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

function pidFilePath(root: string) {
  return path.join(root, ".run", "bot.pid");
}

function readPidFile(root: string): number | null {
  try {
    const raw = fs.readFileSync(pidFilePath(root), "utf8").trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function writePidFile(root: string, pid: number) {
  const dir = path.dirname(pidFilePath(root));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pidFilePath(root), String(pid), "utf8");
}

function clearPidFile(root: string) {
  try {
    fs.unlinkSync(pidFilePath(root));
  } catch {
    /* ignore */
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function pidListeningOnPort(port: number): number | null {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "tcp"], {
        encoding: "utf8",
        windowsHide: true,
      });
      const portRe = new RegExp(`:${port}(?=\\s)`);
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line) || !portRe.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isInteger(pid) && pid > 0) return pid;
      }
      return null;
    }
    const out = execFileSync("ss", ["-ltnp", `sport = :${port}`], {
      encoding: "utf8",
    });
    const m = out.match(/pid=(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

export function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(400);
    const done = (up: boolean) => {
      socket.destroy();
      resolve(up);
    };
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function fetchHealthz(): Promise<boolean> {
  try {
    const res = await fetch(`${wspBotControlUrl()}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function readProcessInfo(): Promise<WspBotProcessInfo> {
  const botRoot = wspBotRoot();
  const running = await fetchHealthz();
  if (usesCoolifyBotControl() || !isLoopbackControlUrl()) {
    return { running, pid: null, botRoot };
  }
  const port = wspBotControlPort();
  const portPid = running ? pidListeningOnPort(port) : null;
  const filePid = readPidFile(botRoot);
  const pid = portPid ?? (filePid && pidAlive(filePid) ? filePid : null);
  return { running, pid, botRoot };
}

function killPid(pid: number) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ignore */
  }
}

function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.PORT;
  delete env.NODE_OPTIONS;
  env.WSP_BOT_HEALTH_PORT = String(wspBotControlPort());
  return env;
}

async function waitFor(fn: () => Promise<boolean>, ms: number, step = 400) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await sleep(step);
  }
  return false;
}

async function coolifyCall(
  action: "start" | "stop" | "restart",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uuid = wspBotCoolifyUuid();
  const token = coolifyApiToken();
  const base = coolifyApiUrl();
  const qs = action === "stop" ? "?docker_cleanup=false" : "";
  try {
    const res = await fetch(
      `${base}/api/v1/applications/${uuid}/${action}${qs}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Coolify ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Coolify no responde";
    return { ok: false, error: msg };
  }
}

async function gracefulShutdown(info: WspBotProcessInfo) {
  const url = wspBotControlUrl();
  const key = process.env.WSP_BOT_API_KEY?.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (key) headers.authorization = `Bearer ${key}`;
  try {
    await fetch(`${url}/console`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "shutdown" }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* ya estaba caído o no acepta shutdown */
  }
  const port = wspBotControlPort();
  const host = wspBotControlHost();
  const down = await waitFor(
    async () => !(await isPortOpen(port, host)),
    6000,
    250,
  );
  if (down) return;
  const pids = new Set<number>();
  if (info.pid) pids.add(info.pid);
  const portPid = pidListeningOnPort(port);
  if (portPid) pids.add(portPid);
  for (const pid of pids) {
    try {
      killPid(pid);
    } catch {
      /* ignore */
    }
  }
  await waitFor(async () => !(await isPortOpen(port, host)), 4000, 200);
}

export async function startBotProcess(): Promise<WspBotProcessResult> {
  const info = await readProcessInfo();
  if (info.running) {
    return { ok: true, message: "El bot ya estaba en marcha.", process: info };
  }

  if (usesCoolifyBotControl()) {
    const called = await coolifyCall("start");
    if (!called.ok) {
      return { ok: false, error: called.error, process: info };
    }
    const up = await waitFor(fetchHealthz, 90_000, 1500);
    const next = await readProcessInfo();
    if (!up) {
      return {
        ok: false,
        error:
          "Coolify aceptó el arranque, pero /healthz no respondió a tiempo. Revisá el deploy en el panel.",
        process: next,
      };
    }
    return { ok: true, message: "Bot encendido en Coolify.", process: next };
  }

  if (!isLoopbackControlUrl()) {
    return {
      ok: false,
      error:
        "El panel no tiene WSP_BOT_COOLIFY_UUID + COOLIFY_TOKEN. Sin eso no puede prender el bot remoto.",
      process: info,
    };
  }

  const root = info.botRoot;
  const indexJs = path.join(root, "index.js");
  if (!fs.existsSync(indexJs)) {
    return {
      ok: false,
      error: `No encuentro ${indexJs}. Definí WSP_BOT_ROOT en el .env del panel.`,
      process: info,
    };
  }

  const child = spawn(process.execPath, ["index.js"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: childEnv(),
  });
  if (!child.pid) {
    return {
      ok: false,
      error: "Node no devolvió PID al arrancar el bot.",
      process: info,
    };
  }
  child.unref();
  writePidFile(root, child.pid);

  const port = wspBotControlPort();
  const up = await waitFor(() => isPortOpen(port), 20_000, 400);
  const next = await readProcessInfo();
  if (!up) {
    return {
      ok: false,
      error: `Se lanzó el proceso (PID ${child.pid}) pero :${port} no abrió a tiempo.`,
      process: next,
    };
  }
  return { ok: true, message: "Bot encendido.", process: next };
}

export async function stopBotProcess(): Promise<WspBotProcessResult> {
  const info = await readProcessInfo();
  if (usesCoolifyBotControl()) {
    if (!info.running) {
      return { ok: true, message: "El bot ya estaba apagado.", process: info };
    }
    const called = await coolifyCall("stop");
    if (!called.ok) {
      return { ok: false, error: called.error, process: info };
    }
    const down = await waitFor(async () => !(await fetchHealthz()), 45_000, 800);
    const next = await readProcessInfo();
    if (!down) {
      return {
        ok: false,
        error: "Coolify aceptó el stop, pero el bot sigue respondiendo.",
        process: next,
      };
    }
    return { ok: true, message: "Bot apagado en Coolify.", process: next };
  }

  if (!info.running && !info.pid) {
    return { ok: true, message: "El bot ya estaba apagado.", process: info };
  }
  await gracefulShutdown(info);
  if (isLoopbackControlUrl()) clearPidFile(info.botRoot);
  const next = await readProcessInfo();
  if (next.running) {
    return {
      ok: false,
      error: "No se pudo cerrar el proceso del bot.",
      process: next,
    };
  }
  return { ok: true, message: "Bot apagado.", process: next };
}

export async function restartBotProcess(): Promise<WspBotProcessResult> {
  if (usesCoolifyBotControl()) {
    const info = await readProcessInfo();
    const called = await coolifyCall("restart");
    if (!called.ok) {
      return { ok: false, error: called.error, process: info };
    }
    const up = await waitFor(fetchHealthz, 90_000, 1500);
    const next = await readProcessInfo();
    if (!up) {
      return {
        ok: false,
        error:
          "Coolify aceptó el reinicio, pero /healthz no respondió a tiempo.",
        process: next,
      };
    }
    return { ok: true, message: "Bot reiniciado en Coolify.", process: next };
  }

  const stopped = await stopBotProcess();
  if (!stopped.ok) return stopped;
  await sleep(800);
  const started = await startBotProcess();
  if (!started.ok) return started;
  return { ok: true, message: "Bot reiniciado.", process: started.process };
}
