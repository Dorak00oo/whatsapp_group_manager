import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import { listActiveMonitorAlerts } from "@/lib/minecraft-monitor-alerts";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const alerts = await listActiveMonitorAlerts(authz.serverId);
  return NextResponse.json({ ok: true, alerts });
}
