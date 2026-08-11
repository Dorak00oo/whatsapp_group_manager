import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  clearMonitorSyncRequest,
  isMonitorSyncPending,
  requestMonitorSync,
} from "@/lib/monitor-events-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/** Panel: pide al addon que envíe el lote de monitoreo. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  requestMonitorSync();
  return NextResponse.json({ ok: true, requestedAt: new Date().toISOString() });
}

/** Addon: ¿hay solicitud pendiente? */
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

  return NextResponse.json({ ok: true, pending: isMonitorSyncPending() });
}

/** Addon: confirma envío. */
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

  clearMonitorSyncRequest();
  return NextResponse.json({ ok: true });
}
