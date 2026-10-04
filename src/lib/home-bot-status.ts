import {
  classifyBotStatus,
  wspBotControlUrl,
  type WspBotConsoleView,
} from "@/lib/wsp-bot-console";

export type HomeBotTone = "connected" | "waiting" | "offline" | "unknown";

export type HomeBotPresentation = {
  tone: HomeBotTone;
  label: string;
  detail: string | null;
};

function isConsoleView(value: unknown): value is WspBotConsoleView {
  if (!value || typeof value !== "object") return false;
  const view = value as { ok?: unknown; offline?: unknown; connected?: unknown };
  if (view.offline === true && view.ok === false) return true;
  return view.ok === true && typeof view.connected === "boolean";
}

/** Etiqueta de Inicio. `null` (no hubo respuesta) es «Sin datos», distinto de desconectado. */
export function presentHomeBot(view: WspBotConsoleView | null): HomeBotPresentation {
  if (!view) return { tone: "unknown", label: "Sin datos", detail: null };
  const kind = classifyBotStatus(view);
  if (kind === "connected") {
    const name = view.ok ? view.userName?.trim() || null : null;
    return { tone: "connected", label: "Conectado", detail: name };
  }
  if (kind === "waiting") {
    return { tone: "waiting", label: "Esperando vínculo", detail: null };
  }
  return { tone: "offline", label: "Desconectado", detail: null };
}

/** Consulta corta al bot. Si no responde a tiempo, Inicio muestra «Sin datos». */
export async function fetchHomeBotStatus(
  timeoutMs = 2000,
): Promise<WspBotConsoleView | null> {
  const url = wspBotControlUrl();
  const key = process.env.WSP_BOT_API_KEY?.trim();
  const headers: HeadersInit = key ? { authorization: `Bearer ${key}` } : {};
  try {
    const res = await fetch(`${url}/console`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isConsoleView(data) ? data : null;
  } catch {
    return null;
  }
}
