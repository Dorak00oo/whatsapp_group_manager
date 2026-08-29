import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import { enqueueMinecraftPanelCommand } from "@/lib/minecraft-sync-request";
import {
  readMinecraftQueueRow,
  updateMinecraftQueueData,
} from "@/lib/minecraft-queue";
import { asSyncRequestData } from "@/lib/minecraft-sync-request-data";

export const runtime = "nodejs";

const ALLOWED_PANEL_COMMANDS = new Set(["syncall"]);

export async function POST(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  let command: "syncall" = "syncall";
  try {
    const body = (await request.json()) as { command?: unknown };
    if (
      typeof body.command === "string" &&
      ALLOWED_PANEL_COMMANDS.has(body.command.trim())
    ) {
      command = body.command.trim() as "syncall";
    }
  } catch {
    /* sin cuerpo / no JSON → syncall */
  }

  const { requestedAt } = await enqueueMinecraftPanelCommand(
    command,
    authz.serverId,
  );

  return NextResponse.json({ ok: true, command, requestedAt });
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  const found = await readMinecraftQueueRow(
    authz.serverId,
    "minecraft_sync_request",
  );
  const data = asSyncRequestData(found?.data);
  const pending =
    Boolean(data.requestedAt) && data.requestedAt !== data.handledAt;

  return NextResponse.json({
    ok: true,
    pending,
    command: pending ? data.command ?? "syncall" : null,
    requestedAt: data.requestedAt ?? null,
  });
}

export async function PUT(request: Request) {
  let body: { requestedAt?: unknown; serverId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const authz = await requireMinecraftAddon(request, body);
  if (!authz.ok) return authz.response;

  const requestedAt =
    typeof body.requestedAt === "string" ? body.requestedAt : "";
  if (!requestedAt) {
    return NextResponse.json(
      { error: "requestedAt es requerido" },
      { status: 400 },
    );
  }

  const found = await readMinecraftQueueRow(
    authz.serverId,
    "minecraft_sync_request",
  );
  if (!found) {
    return NextResponse.json({ error: "Sin cola de panel" }, { status: 404 });
  }

  const prev = asSyncRequestData(found.data);

  await updateMinecraftQueueData(found.id, {
    command: prev.command ?? "syncall",
    requestedAt: prev.requestedAt ?? requestedAt,
    handledAt: requestedAt,
  });

  return NextResponse.json({ ok: true, handledAt: requestedAt });
}
