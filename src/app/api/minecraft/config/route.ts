import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  MINECRAFT_CONFIG_DEFAULTS,
  type MinecraftConfigUpdateInput,
  minecraftConfigToPayload,
} from "@/lib/minecraft-config-defaults";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

type ConfigBody = {
  daysInactive?: number;
  daysBlacklist?: number;
  daysPurge?: number;
  snapshotRetentionDays?: number;
  snapshotKeepMinimum?: number;
};

function pickPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && value > 0 && Number.isFinite(value)
    ? Math.floor(value)
    : undefined;
}

// GET: Obtener configuración actual
export async function GET(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) {
    return unauthorized();
  }

  try {
    let config = await prisma.minecraftConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await prisma.minecraftConfig.create({
        data: { id: "default", ...MINECRAFT_CONFIG_DEFAULTS },
      });
    }

    return NextResponse.json({
      ok: true,
      config: minecraftConfigToPayload(config),
    });
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 },
    );
  }
}

// POST: Actualizar configuración
export async function POST(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  const token = getBearerToken(request);

  if (token) {
    if (!secret) {
      return NextResponse.json(
        { error: "MINECRAFT_API_KEY no configurado" },
        { status: 503 },
      );
    }
    if (token !== secret) {
      return unauthorized();
    }
  } else {
    const session = await auth();
    if (!session?.user) {
      return unauthorized();
    }
  }

  let body: ConfigBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

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

    const config = await prisma.minecraftConfig.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        daysInactive: daysInactive ?? MINECRAFT_CONFIG_DEFAULTS.daysInactive,
        daysBlacklist:
          daysBlacklist ?? MINECRAFT_CONFIG_DEFAULTS.daysBlacklist,
        daysPurge: daysPurge ?? MINECRAFT_CONFIG_DEFAULTS.daysPurge,
        snapshotRetentionDays:
          snapshotRetentionDays ??
          MINECRAFT_CONFIG_DEFAULTS.snapshotRetentionDays,
        snapshotKeepMinimum:
          snapshotKeepMinimum ??
          MINECRAFT_CONFIG_DEFAULTS.snapshotKeepMinimum,
      },
    });

    return NextResponse.json({
      ok: true,
      config: minecraftConfigToPayload(config),
    });
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 },
    );
  }
}
