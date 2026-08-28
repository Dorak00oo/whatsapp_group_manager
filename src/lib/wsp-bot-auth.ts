import { timingSafeEqual } from "node:crypto";

export function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

export function bearerMatches(secret: string, token: string): boolean {
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function wspBotUnauthorized() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

export function wspBotSecretMissing() {
  return Response.json(
    { error: "WSP_BOT_API_KEY no configurado" },
    { status: 503 },
  );
}
