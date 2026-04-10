import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BOT_PANEL_MIGRATE_HINT,
  isPrismaMissingTableError,
} from "@/lib/prisma-migrate-hint";

export const runtime = "nodejs";

const DEFAULT_ID = "default";

function getBearerSecret(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * El bot (Fly) hace polling aquí con Authorization: Bearer BOT_WEBHOOK_SECRET
 * para cargar parámetros guardados en la web.
 */
export async function GET(request: Request) {
  const secret = process.env.BOT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "BOT_WEBHOOK_SECRET no configurado" },
      { status: 503 },
    );
  }
  if (getBearerSecret(request) !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const row = await prisma.botPanelSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    const data =
      row?.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {};
    return NextResponse.json({ data });
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      return NextResponse.json({ error: BOT_PANEL_MIGRATE_HINT }, { status: 503 });
    }
    throw e;
  }
}
