import { NextResponse } from "next/server";
import { requireMinecraftPanel } from "@/lib/minecraft-api-context";
import { dismissMonitorAlert } from "@/lib/minecraft-monitor-alerts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  const authz = await requireMinecraftPanel();
  if (!authz.ok) return authz.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const ok = await dismissMonitorAlert(id.trim(), authz.serverId);
  if (!ok) {
    return NextResponse.json(
      { error: "Alerta no encontrada o ya descartada" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
