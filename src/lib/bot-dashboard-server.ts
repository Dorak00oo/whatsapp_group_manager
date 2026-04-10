/**
 * Llamadas server-side al bot en Fly (o donde esté desplegado).
 * El secreto solo vive en variables de entorno del servidor Next.
 */

export function getBotRemoteEnv(): {
  base: string;
  secret: string;
  configured: boolean;
} {
  const base = (process.env.BOT_REMOTE_BASE_URL ?? "").trim().replace(/\/$/, "");
  const secret = (process.env.BOT_DASHBOARD_SECRET ?? "").trim();
  return { base, secret, configured: Boolean(base && secret) };
}

export type BotRemoteState = {
  sessionConnected: boolean;
  qrDataUrl: string | null;
  /** Código de 8 dígitos formateado (ej. XXXX-XXXX), si el bot lo generó vía panel. */
  pairingCode?: string | null;
  logs: string[];
  runtimeConfig: Record<string, unknown>;
  panelConfigFromWeb: Record<string, unknown>;
};

const OK_BODY_HINT =
  "El bot respondió solo «ok» (la página de salud en /). En Fly suele faltar un deploy reciente con fly-runtime.mjs: en YukiBot-MD ejecutá flyctl deploy, y en Fly: fly secrets set BOT_DASHBOARD_SECRET=\"…\" (mismo valor que en .env). Probar: curl -sS -H \"Authorization: Bearer TU_SECRETO\" TU_URL/__bot/state → debe ser JSON.";

async function readBotJsonResponse<T>(
  r: Response,
  what: string,
): Promise<T> {
  const text = await r.text();
  const trimmed = text.trim();
  if (!r.ok) {
    throw new Error(
      `${what}: HTTP ${r.status} — ${trimmed.slice(0, 200) || "(cuerpo vacío)"}`,
    );
  }
  if (trimmed === "ok") {
    throw new Error(`${what}: ${OK_BODY_HINT}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${what}: no es JSON (${trimmed.slice(0, 120)}). ¿Secreto incorrecto (401 texto) o URL mal puesta?`,
    );
  }
}

export async function fetchBotRemoteState(): Promise<BotRemoteState | null> {
  const { base, secret, configured } = getBotRemoteEnv();
  if (!configured) return null;
  const url = `${base}/__bot/state`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  return readBotJsonResponse<BotRemoteState>(r, `GET ${url}`);
}

export async function pushConfigToBotRemote(
  data: Record<string, unknown>,
): Promise<void> {
  const { base, secret, configured } = getBotRemoteEnv();
  if (!configured) return;
  const url = `${base}/__bot/config`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(20_000),
  });
  await readBotJsonResponse<{ ok?: boolean }>(r, `POST ${url}`);
}

export type RequestQrResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

/** Pide al proceso del bot que borre la sesión Owner y reinicie el socket (nuevo QR). */
export type RequestPairingCodeResult = {
  ok: boolean;
  error?: string;
  message?: string;
  pairingCode?: string;
};

/** Pide al bot un código de emparejamiento de 8 dígitos (número en formato internacional). */
export async function requestPairingCodeFromBotRemote(
  phone: string,
): Promise<RequestPairingCodeResult> {
  const { base, secret, configured } = getBotRemoteEnv();
  if (!configured) {
    return {
      ok: false,
      error: "not_configured",
      message: "BOT_REMOTE_BASE_URL o BOT_DASHBOARD_SECRET no configurados.",
    };
  }
  const url = `${base}/__bot/pairing/request-code`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: phone.trim() }),
    signal: AbortSignal.timeout(120_000),
  });
  try {
    const o = await readBotJsonResponse<RequestPairingCodeResult>(
      r,
      `POST ${url}`,
    );
    if (!o.ok) {
      return {
        ok: false,
        error: o.error || "unknown",
        message: o.message || "El bot rechazó la operación.",
      };
    }
    return o;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: "bad_response",
      message: msg,
    };
  }
}

export async function requestNewQrFromBotRemote(): Promise<RequestQrResult> {
  const { base, secret, configured } = getBotRemoteEnv();
  if (!configured) {
    return {
      ok: false,
      error: "not_configured",
      message: "BOT_REMOTE_BASE_URL o BOT_DASHBOARD_SECRET no configurados.",
    };
  }
  const url = `${base}/__bot/pairing/request-qr`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(120_000),
  });
  try {
    const o = await readBotJsonResponse<RequestQrResult>(r, `POST ${url}`);
    if (!o.ok) {
      return {
        ok: false,
        error: o.error || "unknown",
        message: o.message || "El bot rechazó la operación.",
      };
    }
    return o;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: "bad_response",
      message: msg,
    };
  }
}
