import { NextResponse } from "next/server";
import {
  requireMinecraftAddon,
  requireMinecraftPanel,
} from "@/lib/minecraft-api-context";
import {
  clearMonitorSyncRequest,
  isMonitorSyncPending,
  requestMonitorSync,
} from "@/lib/monitor-events-store";

export const runtime = "nodejs";

export async function POST() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  requestMonitorSync(authz.serverId);
  return NextResponse.json({ ok: true, requestedAt: new Date().toISOString() });
}

export async function GET(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  return NextResponse.json({
    ok: true,
    pending: isMonitorSyncPending(authz.serverId),
  });
}

export async function PUT(request: Request) {
  const authz = await requireMinecraftAddon(request);
  if (!authz.ok) return authz.response;

  clearMonitorSyncRequest(authz.serverId);
  return NextResponse.json({ ok: true });
}
