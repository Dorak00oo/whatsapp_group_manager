export type WspBotLogLine = {
  ts: string;
  level: string;
  message: string;
};

export type WspBotProcessInfo = {
  running: boolean;
  pid: number | null;
  botRoot: string;
};

export type WspBotConsoleOnline = {
  ok: true;
  offline: false;
  connected: boolean;
  registered: boolean;
  userName: string | null;
  userJid: string | null;
  pairingCode: string | null;
  qrUpdatedAt: string | null;
  pairingUpdatedAt: string | null;
  hasQr: boolean;
  qrDataUrl?: string | null;
  mediaRoot?: string | null;
  logs: WspBotLogLine[];
  process?: WspBotProcessInfo;
};

export type WspBotConsoleOffline = {
  ok: false;
  offline: true;
  error: string;
  process?: WspBotProcessInfo;
};

export type WspBotConsoleView = WspBotConsoleOnline | WspBotConsoleOffline;

export type WspBotStatusKind = "offline" | "waiting" | "connected";

export function classifyBotStatus(view: WspBotConsoleView): WspBotStatusKind {
  if (!view.ok || view.offline) return "offline";
  if (view.connected) return "connected";
  return "waiting";
}

export function wspBotControlUrl(): string {
  return (process.env.WSP_BOT_CONTROL_URL || "http://127.0.0.1:3010").replace(
    /\/+$/,
    "",
  );
}

export function coolifyApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (env.COOLIFY_URL || "http://coolify:8080").replace(/\/+$/, "");
}

export function coolifyApiToken(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env.COOLIFY_TOKEN?.trim() || env.COOLIFY_API_TOKEN?.trim() || ""
  );
}

export function wspBotCoolifyUuid(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.WSP_BOT_COOLIFY_UUID?.trim() || "";
}

/** Prender/Apagar usan la API de Coolify (homelab), no un Node local. */
export function usesCoolifyBotControl(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(wspBotCoolifyUuid(env) && coolifyApiToken(env));
}

export function isLoopbackControlUrl(url = wspBotControlUrl()): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return true;
  }
}
