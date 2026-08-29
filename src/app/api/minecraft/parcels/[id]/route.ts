import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import {
  canDeleteParcel,
  parcelRowUpdateFromPayload,
  type ParcelConfigPayload,
} from "@/lib/minecraft-parcel";
import { syncPrimaryConfigColumns } from "@/lib/minecraft-parcels-db";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
}

export async function PATCH(request: Request, context: Ctx) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const { id } = await context.params;
  const parcelId = id?.trim();
  if (!parcelId) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  let body: Partial<ParcelConfigPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const existing = await prisma.minecraftParcel.findFirst({
    where: { id: parcelId, serverId: authz.serverId },
  });
  if (!existing) return notFound();

  const data = parcelRowUpdateFromPayload(body);
  const updated = await prisma.minecraftParcel.update({
    where: { id: parcelId },
    data,
  });

  if (updated.isPrimary) {
    await syncPrimaryConfigColumns(authz.serverId, {
      enabled: updated.enabled,
      name: updated.name,
      dimension: updated.dimension as ParcelConfigPayload["dimension"],
      minX: updated.minX,
      minY: updated.minY,
      minZ: updated.minZ,
      maxX: updated.maxX,
      maxY: updated.maxY,
      maxZ: updated.maxZ,
    });
  }

  return NextResponse.json({
    ok: true,
    parcel: {
      id: updated.id,
      isPrimary: updated.isPrimary,
      name: updated.name,
      enabled: updated.enabled,
      dimension: updated.dimension,
      minX: updated.minX,
      minY: updated.minY,
      minZ: updated.minZ,
      maxX: updated.maxX,
      maxY: updated.maxY,
      maxZ: updated.maxZ,
    },
  });
}

export async function DELETE(_request: Request, context: Ctx) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const { id } = await context.params;
  const parcelId = id?.trim();
  if (!parcelId) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const existing = await prisma.minecraftParcel.findFirst({
    where: { id: parcelId, serverId: authz.serverId },
    select: { id: true, isPrimary: true },
  });
  if (!existing) return notFound();
  if (!canDeleteParcel(existing.isPrimary)) {
    return NextResponse.json(
      { error: "La parcela original no se puede borrar" },
      { status: 400 },
    );
  }

  await prisma.minecraftParcel.delete({ where: { id: parcelId } });
  return NextResponse.json({ ok: true });
}
