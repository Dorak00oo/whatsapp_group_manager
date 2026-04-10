import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestPairingCodeFromBotRemote } from "@/lib/bot-dashboard-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let phone = "";
  try {
    const body = (await req.json()) as { phone?: unknown };
    phone = typeof body.phone === "string" ? body.phone : "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: "Cuerpo JSON inválido." },
      { status: 400 },
    );
  }

  try {
    const result = await requestPairingCodeFromBotRemote(phone);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json(
      { ok: false, error: "fetch_failed", message: msg },
      { status: 502 },
    );
  }
}
