import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppPhoneInput } from "@/lib/whatsapp-phone-normalize";

export const runtime = "nodejs";

type SyncBody = {
  type?: unknown;
  jid?: unknown;
  phone?: unknown;
  pushName?: unknown;
  gamertag?: unknown;
  groupId?: unknown;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function getBearerSecret(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

function isGroupAllowed(groupId: string | undefined): boolean {
  const raw = process.env.BOT_WEBHOOK_GROUP_IDS?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!groupId) return false;
  return allowed.includes(groupId);
}

export async function POST(request: Request) {
  const secret = process.env.BOT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "BOT_WEBHOOK_SECRET no configurado en el servidor" },
      { status: 503 },
    );
  }

  const token = getBearerSecret(request);
  if (token !== secret) {
    return unauthorized();
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return badRequest("JSON inválido");
  }

  const type = typeof body.type === "string" ? body.type : "";
  if (type !== "join" && type !== "leave") {
    return badRequest('type debe ser "join" o "leave"');
  }

  const groupId =
    typeof body.groupId === "string" ? body.groupId.trim() : undefined;
  if (!isGroupAllowed(groupId)) {
    return NextResponse.json({ ok: true, skipped: "group_not_allowed" });
  }

  const jidOrPhone =
    typeof body.jid === "string" && body.jid.trim()
      ? body.jid.trim()
      : typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : "";
  if (!jidOrPhone) {
    return badRequest("Indica jid (recomendado) o phone en formato internacional");
  }

  const normalized = normalizeWhatsAppPhoneInput(jidOrPhone);
  if (!normalized.ok) {
    return badRequest(normalized.error);
  }

  const { phone, phoneCountry } = normalized;
  const pushName =
    typeof body.pushName === "string" ? body.pushName.trim() : "";
  const gamertagRaw =
    typeof body.gamertag === "string" ? body.gamertag.trim() : "";

  const email = process.env.COMMUNITY_EMAIL?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "COMMUNITY_EMAIL no configurado" },
      { status: 503 },
    );
  }

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!owner) {
    return NextResponse.json(
      { error: "Usuario del directorio no encontrado para COMMUNITY_EMAIL" },
      { status: 503 },
    );
  }

  const userId = owner.id;

  if (type === "leave") {
    const member = await prisma.directoryMember.findFirst({
      where: { userId, phone },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ ok: true, action: "leave", updated: false });
    }
    await prisma.directoryMember.update({
      where: { id: member.id },
      data: {
        active: false,
        leftAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, action: "leave", updated: true });
  }

  const digits = phone.replace(/\D/g, "");
  const fallbackGamertag = `wa_${digits.slice(-10)}`;
  const gamertag = gamertagRaw || fallbackGamertag;
  const displayName = pushName || null;

  const existing = await prisma.directoryMember.findFirst({
    where: { userId, phone },
    select: { id: true },
  });

  if (existing) {
    await prisma.directoryMember.update({
      where: { id: existing.id },
      data: {
        gamertag: gamertagRaw ? gamertagRaw : undefined,
        displayName: displayName ?? undefined,
        phoneCountry: phoneCountry ?? undefined,
        active: true,
        leftAt: null,
      },
    });
    return NextResponse.json({
      ok: true,
      action: "join",
      updated: true,
      created: false,
    });
  }

  await prisma.directoryMember.create({
    data: {
      userId,
      gamertag,
      displayName,
      phone,
      phoneCountry,
      active: true,
    },
  });

  return NextResponse.json({
    ok: true,
    action: "join",
    updated: true,
    created: true,
  });
}
