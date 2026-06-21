import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  clearParcelSyncRequest,
  isParcelSyncPending,
  requestParcelSync,
} from "@/lib/parcel-events-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/** Panel: pide al addon que envíe el lote acumulado (solo memoria, sin BD). */
export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  requestParcelSync();

  return NextResponse.json({ ok: true, requestedAt: new Date().toISOString() });
}

/** Addon: ¿hay solicitud pendiente de envío de parcela? */
export async function GET(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) return unauthorized();

  return NextResponse.json({ ok: true, pending: isParcelSyncPending() });
}

/** Addon: confirma que ya envió el lote. */
export async function PUT(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) return unauthorized();

  clearParcelSyncRequest();

  return NextResponse.json({ ok: true });
}
