import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getBotRemoteEnv, pushConfigToBotRemote } from "@/lib/bot-dashboard-server";
import {
  BOT_PANEL_MIGRATE_HINT,
  isPrismaMissingTableError,
} from "@/lib/prisma-migrate-hint";

export const runtime = "nodejs";

const DEFAULT_ID = "default";

type Body = { data?: unknown };

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    !body.data ||
    typeof body.data !== "object" ||
    body.data === null ||
    Array.isArray(body.data)
  ) {
    return NextResponse.json(
      { error: "El cuerpo debe ser { data: { ... } } (objeto JSON)" },
      { status: 400 },
    );
  }

  const data = body.data as Record<string, unknown>;
  const dataJson = data as Prisma.InputJsonValue;

  try {
    await prisma.botPanelSettings.upsert({
      where: { id: DEFAULT_ID },
      create: { id: DEFAULT_ID, data: dataJson },
      update: { data: dataJson },
    });
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      return NextResponse.json({ error: BOT_PANEL_MIGRATE_HINT }, { status: 503 });
    }
    throw e;
  }

  const { configured } = getBotRemoteEnv();
  if (configured) {
    try {
      await pushConfigToBotRemote(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return NextResponse.json(
        {
          ok: true,
          saved: true,
          pushedToBot: false,
          pushError: msg,
        },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    saved: true,
    pushedToBot: configured,
    pushError: null,
  });
}
