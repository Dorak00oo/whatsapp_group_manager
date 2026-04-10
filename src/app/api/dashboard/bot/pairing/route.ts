import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestNewQrFromBotRemote } from "@/lib/bot-dashboard-server";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await requestNewQrFromBotRemote();
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json(
      { ok: false, error: "fetch_failed", message: msg },
      { status: 502 },
    );
  }
}
