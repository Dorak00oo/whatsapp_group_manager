import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import {
  MINECRAFT_SERVER_DEFAULTS,
  MINECRAFT_SERVER_IDS,
  parseMinecraftServerId,
} from "@/lib/minecraft-server";
import { persistSelectedMinecraftWorld } from "@/lib/minecraft-world";
import { listMinecraftServers } from "@/lib/minecraft-servers-db";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  let servers: { id: string; name: string; flavor: string; edition: string }[];
  try {
    servers = await listMinecraftServers();
  } catch {
    servers = MINECRAFT_SERVER_IDS.map((id) => ({
      id,
      ...MINECRAFT_SERVER_DEFAULTS[id],
    }));
  }

  return NextResponse.json({
    ok: true,
    serverId: authz.serverId,
    servers,
  });
}

export async function POST(request: Request) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  let body: { serverId?: unknown; world?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const id = parseMinecraftServerId(body.serverId ?? body.world);
  if (!id) {
    return NextResponse.json({ error: "Mundo inválido" }, { status: 400 });
  }

  await persistSelectedMinecraftWorld(id);
  return NextResponse.json({ ok: true, serverId: id });
}
