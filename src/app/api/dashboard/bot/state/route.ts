import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchBotRemoteState, getBotRemoteEnv } from "@/lib/bot-dashboard-server";
import {
  BOT_PANEL_MIGRATE_HINT,
  isPrismaMissingTableError,
} from "@/lib/prisma-migrate-hint";

export const runtime = "nodejs";

const DEFAULT_ID = "default";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let panelConfig: Record<string, unknown> = {};
  try {
    const row = await prisma.botPanelSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    panelConfig =
      row?.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {};
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      return NextResponse.json(
        {
          remote: null,
          panelConfig: {},
          error: BOT_PANEL_MIGRATE_HINT,
          botRemoteConfigured: getBotRemoteEnv().configured,
        },
        { status: 503 },
      );
    }
    throw e;
  }

  const { configured } = getBotRemoteEnv();
  if (!configured) {
    return NextResponse.json({
      remote: null,
      panelConfig,
      error: null,
      botRemoteConfigured: false,
    });
  }

  try {
    const remote = await fetchBotRemoteState();
    return NextResponse.json({
      remote,
      panelConfig,
      error: null,
      botRemoteConfigured: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json(
      {
        remote: null,
        panelConfig,
        error: `No se pudo contactar al bot: ${msg}`,
        botRemoteConfigured: true,
      },
      { status: 502 },
    );
  }
}
