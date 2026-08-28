import { auth } from "@/auth";
import { bearerMatches, getBearerToken } from "@/lib/wsp-bot-auth";
import {
  type WspBotConsoleView,
  wspBotControlUrl,
} from "@/lib/wsp-bot-console";
import {
  readProcessInfo,
  restartBotProcess,
  startBotProcess,
  stopBotProcess,
} from "@/lib/wsp-bot-process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

function botAuthHeaders(): HeadersInit {
  const key = process.env.WSP_BOT_API_KEY?.trim();
  if (!key) return {};
  return { authorization: `Bearer ${key}` };
}

async function requireSession() {
  const session = await auth();
  return Boolean(session?.user);
}

async function proxyGet(): Promise<Response> {
  const url = wspBotControlUrl();
  const processInfo = await readProcessInfo();
  try {
    const res = await fetch(`${url}/console`, {
      headers: botAuthHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          offline: true,
          error: `Bot respondió ${res.status}: ${text.slice(0, 200)}`,
          process: processInfo,
        } satisfies WspBotConsoleView,
        { status: 200 },
      );
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { ok: false, offline: true, error: text.slice(0, 200) };
    }
    return Response.json(
      { ...parsed, process: processInfo },
      { headers: { "cache-control": "no-store, no-cache, must-revalidate" } },
    );
  } catch {
    const body: WspBotConsoleView = {
      ok: false,
      offline: true,
      error: `Bot no responde en ${url}. Usá Prender en esta página (Coolify).`,
      process: processInfo,
    };
    return Response.json(body, {
      status: 200,
      headers: { "cache-control": "no-store, no-cache, must-revalidate" },
    });
  }
}

async function proxyPost(body: unknown): Promise<Response> {
  const url = wspBotControlUrl();
  try {
    const res = await fetch(`${url}/console`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...botAuthHeaders(),
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json(
      { error: `Bot no responde en ${url}` },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const sessionOk = await requireSession();
  if (!sessionOk) {
    const token = getBearerToken(request);
    const key = process.env.WSP_BOT_API_KEY?.trim();
    if (!key || !token || !bearerMatches(key, token)) return unauthorized();
  }
  return proxyGet();
}

export async function POST(request: Request) {
  const sessionOk = await requireSession();
  if (!sessionOk) return unauthorized();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const action =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { action?: unknown }).action
      : undefined;

  if (action === "start" || action === "stop" || action === "restart") {
    const result =
      action === "start"
        ? await startBotProcess()
        : action === "stop"
          ? await stopBotProcess()
          : await restartBotProcess();
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  return proxyPost(body);
}
