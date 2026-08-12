import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listActiveMonitorAlerts } from "@/lib/minecraft-monitor-alerts";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

/** Panel: alertas activas (5 días, no descartadas). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const alerts = await listActiveMonitorAlerts();
  return NextResponse.json({ ok: true, alerts });
}
