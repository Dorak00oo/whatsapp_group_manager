import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dismissMonitorAlert } from "@/lib/minecraft-monitor-alerts";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

type Ctx = { params: Promise<{ id: string }> };

/** Panel: descartar alerta manualmente. */
export async function DELETE(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const ok = await dismissMonitorAlert(id.trim());
  if (!ok) {
    return NextResponse.json(
      { error: "Alerta no encontrada o ya descartada" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
