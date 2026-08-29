import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import { parseMinecraftServerId } from "@/lib/minecraft-server";
import { prisma } from "@/lib/prisma";
import { ensureMinecraftServers } from "@/lib/minecraft-servers-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const { id: rawId } = await context.params;
  const id = parseMinecraftServerId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Mundo inválido" }, { status: 400 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 40) {
    return NextResponse.json(
      { error: "El nombre debe tener entre 1 y 40 caracteres" },
      { status: 400 },
    );
  }

  await ensureMinecraftServers();
  const updated = await prisma.minecraftServer.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json({
    ok: true,
    server: {
      id: updated.id,
      name: updated.name,
      flavor: updated.flavor,
      edition: updated.edition,
    },
  });
}
