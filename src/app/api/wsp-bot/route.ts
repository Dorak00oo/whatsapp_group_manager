import { NextResponse } from "next/server";
import {
  bearerMatches,
  getBearerToken,
  wspBotSecretMissing,
  wspBotUnauthorized,
} from "@/lib/wsp-bot-auth";
import { parseDirectoryAge } from "@/lib/directory-age";
import { applyWspBotEvent, applyWspBotSync } from "@/lib/wsp-bot-sync";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asParticipant(
  value: unknown,
):
  | { error: string }
  | {
      jid?: string;
      username?: string;
      name?: string;
      gamertag?: string;
      age?: number;
    }
  | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const jidRaw = (value as { jid?: unknown }).jid;
  const usernameRaw = (value as { username?: unknown }).username;
  const jid = typeof jidRaw === "string" ? jidRaw.trim() : "";
  const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "";
  if (!jid && !username) return null;
  const name = (value as { name?: unknown }).name;
  const gamertag = (value as { gamertag?: unknown }).gamertag;
  const ageParsed = parseDirectoryAge((value as { age?: unknown }).age);
  if (!ageParsed.ok) return { error: ageParsed.error };
  return {
    ...(jid ? { jid } : {}),
    ...(username ? { username } : {}),
    name: typeof name === "string" ? name : undefined,
    gamertag: typeof gamertag === "string" ? gamertag : undefined,
    ...(ageParsed.age != null ? { age: ageParsed.age } : {}),
  };
}

export async function GET(request: Request) {
  const secret = process.env.WSP_BOT_API_KEY?.trim();
  if (!secret) return wspBotSecretMissing();
  const token = getBearerToken(request);
  if (!token || !bearerMatches(secret, token)) return wspBotUnauthorized();
  return NextResponse.json({ ok: true, service: "wsp-bot" });
}

export async function POST(request: Request) {
  const secret = process.env.WSP_BOT_API_KEY?.trim();
  if (!secret) return wspBotSecretMissing();
  const token = getBearerToken(request);
  if (!token || !bearerMatches(secret, token)) return wspBotUnauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Cuerpo inválido");
  }

  const action = (body as { action?: unknown }).action;
  if (action === "join" || action === "leave") {
    const participant = asParticipant((body as { participant?: unknown }).participant);
    if (!participant) return badRequest("Falta participant.jid o participant.username");
    if ("error" in participant) return badRequest(participant.error);
    const result = await applyWspBotEvent({ action, participant });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  if (action === "sync") {
    const raw = (body as { participants?: unknown }).participants;
    if (!Array.isArray(raw)) return badRequest("Falta participants[]");
    const participants = [];
    for (const row of raw) {
      const p = asParticipant(row);
      if (!p || "error" in p) continue;
      participants.push(p);
    }
    const markMissingAsLeft = Boolean(
      (body as { markMissingAsLeft?: unknown }).markMissingAsLeft,
    );
    const result = await applyWspBotSync({ participants, markMissingAsLeft });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  }

  return badRequest("action debe ser join, leave o sync");
}
