import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const parcels = await ensurePrimaryParcel();
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
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    await ensurePrimaryParcel();
    const extras = await extraParcelCount();
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
