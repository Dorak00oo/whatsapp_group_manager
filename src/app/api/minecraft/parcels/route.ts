import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import {
  canAddExtraParcel,
  extraParcelCreatePayload,
} from "@/lib/minecraft-parcel";
import {
  ensurePrimaryParcel,
  extraParcelCount,
} from "@/lib/minecraft-parcels-db";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  try {
    const parcels = await ensurePrimaryParcel(authz.serverId);
    return NextResponse.json({ ok: true, parcels });
  } catch (error) {
    console.error("[Minecraft Parcels API] GET:", error);
    return NextResponse.json(
      { error: "Error al listar parcelas" },
      { status: 500 },
    );
  }
}

export async function POST() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;
  const { serverId } = authz;

  try {
    await ensurePrimaryParcel(serverId);
    const extras = await extraParcelCount(serverId);
    if (!canAddExtraParcel(extras)) {
      return NextResponse.json(
        { error: "Máximo 5 parcelas extra" },
        { status: 400 },
      );
    }
    const payload = extraParcelCreatePayload(extras + 1);
    const created = await prisma.minecraftParcel.create({
      data: {
        id: payload.id,
        serverId,
        isPrimary: false,
        name: payload.name,
        enabled: payload.enabled,
        dimension: payload.dimension,
        minX: payload.minX,
        minY: payload.minY,
        minZ: payload.minZ,
        maxX: payload.maxX,
        maxY: payload.maxY,
        maxZ: payload.maxZ,
      },
    });
    return NextResponse.json({
      ok: true,
      parcel: {
        id: created.id,
        isPrimary: created.isPrimary,
        name: created.name,
        enabled: created.enabled,
        dimension: created.dimension,
        minX: created.minX,
        minY: created.minY,
        minZ: created.minZ,
        maxX: created.maxX,
        maxY: created.maxY,
        maxZ: created.maxZ,
      },
    });
  } catch (error) {
    console.error("[Minecraft Parcels API] POST:", error);
    return NextResponse.json(
      { error: "Error al crear parcela" },
      { status: 500 },
    );
  }
}
