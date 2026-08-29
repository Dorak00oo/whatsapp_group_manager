import { NextResponse } from "next/server";
import { sanitizeBannedItemsList } from "@/lib/minecraft-banned-items";
import {
  type MinecraftConfigUpdateInput,
} from "@/lib/minecraft-config-defaults";
import {
  DEFAULT_MONITOR_EXCLUDE,
  normalizeBlockId,
} from "@/lib/minecraft-monitor";
import {
  parcelPrismaUpdateFromPayload,
  parcelRowUpdateFromPayload,
  type ParcelConfigPayload,
} from "@/lib/minecraft-parcel";
import {
  ensurePrimaryParcel,
  fullMinecraftConfigPayload,
} from "@/lib/minecraft-parcels-db";
import { prisma } from "@/lib/prisma";
import {
  requireMinecraftAddon,
  requireMinecraftAddonOrPanel,
} from "@/lib/minecraft-api-context";
import {
  ensureMinecraftConfig,
  getMinecraftServer,
} from "@/lib/minecraft-servers-db";
import type { MinecraftServerId } from "@/lib/minecraft-server";

export const runtime = "nodejs";

type ConfigBody = {
  serverId?: unknown;
  flavor?: unknown;
  daysInactive?: number;
  daysBlacklist?: number;
  daysPurge?: number;
  snapshotRetentionDays?: number;
  snapshotKeepMinimum?: number;
  monitorExclude?: string[];
  bannedItems?: string[];
  parcel?: {
    enabled?: boolean;
    name?: string;
    dimension?: string;
    minX?: number;
    minY?: number;
    minZ?: number;
    maxX?: number;
    maxY?: number;
    maxZ?: number;
  };
};

function pickPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && value > 0 && Number.isFinite(value)
    ? Math.floor(value)
    : undefined;
}

async function configResponse(serverId: MinecraftServerId) {
  const [config, server] = await Promise.all([
    ensureMinecraftConfig(serverId),
    getMinecraftServer(serverId),
  ]);
  return {
    ok: true,
    server: {
      id: server.id,
      name: server.name,
      flavor: server.flavor,
      edition: server.edition,
      lastSeenAt: server.lastSeenAt?.toISOString() ?? null,
      lastVersion: server.lastVersion,
      lastWorldName: server.lastWorldName,
    },
    config: await fullMinecraftConfigPayload(config, serverId),
  };
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  try {
    return NextResponse.json(await configResponse(authz.serverId));
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 },
    );
  }
}

async function updateConfig(request: Request) {
  let body: ConfigBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const authz = await requireMinecraftAddonOrPanel(request, body);
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  try {
    const updateData: MinecraftConfigUpdateInput = {};
    const daysInactive = pickPositiveInt(body.daysInactive);
    const daysBlacklist = pickPositiveInt(body.daysBlacklist);
    const daysPurge = pickPositiveInt(body.daysPurge);
    const snapshotRetentionDays = pickPositiveInt(body.snapshotRetentionDays);
    const snapshotKeepMinimum = pickPositiveInt(body.snapshotKeepMinimum);

    if (daysInactive !== undefined) updateData.daysInactive = daysInactive;
    if (daysBlacklist !== undefined) updateData.daysBlacklist = daysBlacklist;
    if (daysPurge !== undefined) updateData.daysPurge = daysPurge;
    if (snapshotRetentionDays !== undefined) {
      updateData.snapshotRetentionDays = snapshotRetentionDays;
    }
    if (snapshotKeepMinimum !== undefined) {
      updateData.snapshotKeepMinimum = snapshotKeepMinimum;
    }

    const parcelFields =
      body.parcel && typeof body.parcel === "object"
        ? parcelPrismaUpdateFromPayload(body.parcel as Partial<ParcelConfigPayload>)
        : {};

    let monitorExcludeJson: string | undefined;
    if (Array.isArray(body.monitorExclude)) {
      const cleaned = body.monitorExclude
        .filter((x): x is string => typeof x === "string")
        .map((x) => normalizeBlockId(x))
        .filter(Boolean);
      monitorExcludeJson = JSON.stringify(
        cleaned.length ? cleaned : DEFAULT_MONITOR_EXCLUDE,
      );
      updateData.monitorExcludeJson = monitorExcludeJson;
    }

    if (Array.isArray(body.bannedItems)) {
      updateData.bannedItemsJson = JSON.stringify(
        sanitizeBannedItemsList(body.bannedItems),
      );
    }

    await ensureMinecraftConfig(serverId);
    await prisma.minecraftConfig.update({
      where: { id: serverId },
      data: { ...updateData, ...parcelFields },
    });

    if (body.parcel && typeof body.parcel === "object") {
      const parcels = await ensurePrimaryParcel(serverId);
      const primary = parcels.find((p) => p.isPrimary) ?? parcels[0];
      if (primary) {
        await prisma.minecraftParcel.update({
          where: { id: primary.id },
          data: parcelRowUpdateFromPayload(
            body.parcel as Partial<ParcelConfigPayload>,
          ),
        });
      }
    }

    return NextResponse.json(await configResponse(serverId));
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return updateConfig(request);
}

export async function PATCH(request: Request) {
  return updateConfig(request);
}
