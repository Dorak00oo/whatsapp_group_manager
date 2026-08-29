import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listMinecraftInstalls } from "@/lib/minecraft-installs-db";
import { listMinecraftServers } from "@/lib/minecraft-servers-db";
import { parseMinecraftServerId } from "@/lib/minecraft-server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const [servers, installs] = await Promise.all([
    listMinecraftServers(),
    listMinecraftInstalls(),
  ]);
  return NextResponse.json({
    ok: true,
    servers: servers.map((s) => ({
      id: s.id,
      name: s.name,
      flavor: s.flavor,
      edition: s.edition,
      lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
      lastVersion: s.lastVersion,
      lastWorldName: s.lastWorldName,
    })),
    installs: installs.map((row) => ({
      id: row.id,
      serverId: row.serverId,
      lastWorldName: row.lastWorldName,
      lastVersion: row.lastVersion,
      lastSeenAt: row.lastSeenAt.toISOString(),
      assignedAt: row.assignedAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: { id?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const id = parseMinecraftServerId(body.id);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!id || name.length < 1 || name.length > 40) {
    return NextResponse.json(
      { error: "id válido y nombre de 1–40 caracteres" },
      { status: 400 },
    );
  }
  const updated = await prisma.minecraftServer.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json({
    ok: true,
    server: { id: updated.id, name: updated.name },
  });
}
