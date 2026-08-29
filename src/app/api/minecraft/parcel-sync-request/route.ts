import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import {
  clearParcelSyncRequest,
  isParcelSyncPending,
  requestParcelSync,
} from "@/lib/parcel-events-store";

export const runtime = "nodejs";

export async function POST() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  requestParcelSync(authz.serverId);
  return NextResponse.json({ ok: true, requestedAt: new Date().toISOString() });
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  return NextResponse.json({
    ok: true,
    pending: isParcelSyncPending(authz.serverId),
  });
}

export async function PUT(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  clearParcelSyncRequest(authz.serverId);
  return NextResponse.json({ ok: true });
}
