import {
  cancelPendingAllowlistRemoval,
  enqueueAllowlistRemovalForMember,
} from "@/lib/allowlist-removal";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
import { normalizeWhatsAppPhoneInput } from "@/lib/whatsapp-phone-normalize";
import {
  findMemberByPhone,
  phonesLikelySame,
  placeholderGamertag,
  planWhatsAppRosterChange,
  type RosterEvent,
} from "@/lib/wsp-bot-directory";

export type WspBotParticipant = {
  jid: string;
  name?: string;
};

type DirectoryRow = {
  id: string;
  phone: string;
  gamertag: string;
  leftAt: Date | null;
  allowlistSyncedAt: Date | null;
  allowlistRemovedAt: Date | null;
};

async function resolveBotDirectoryUserId(): Promise<string | null> {
  const email = process.env.COMMUNITY_EMAIL?.trim().toLowerCase();
  if (email) {
    const byEmail = await withDbRetry(() =>
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    );
    if (byEmail) return byEmail.id;
  }
  const first = await withDbRetry(() =>
    prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  );
  return first?.id ?? null;
}

async function loadMembers(userId: string): Promise<DirectoryRow[]> {
  return withDbRetry(() =>
    prisma.directoryMember.findMany({
      where: { userId },
      select: {
        id: true,
        phone: true,
        gamertag: true,
        leftAt: true,
        allowlistSyncedAt: true,
        allowlistRemovedAt: true,
      },
    }),
  );
}

function parseParticipant(p: WspBotParticipant) {
  const parsed = normalizeWhatsAppPhoneInput(p.jid);
  if (!parsed.ok) return null;
  const digits = parsed.phone.replace(/\D/g, "");
  return {
    phone: parsed.phone,
    phoneCountry: parsed.phoneCountry,
    digits,
    gamertag: placeholderGamertag(digits, p.name),
    displayName: (p.name ?? "").trim() || null,
  };
}

async function applyJoin(
  userId: string,
  members: DirectoryRow[],
  parsed: NonNullable<ReturnType<typeof parseParticipant>>,
): Promise<"created" | "restored" | "skipped"> {
  const existing = findMemberByPhone(members, parsed.phone);
  const plan = planWhatsAppRosterChange(
    existing
      ? { id: existing.id, leftAt: existing.leftAt }
      : null,
    "join",
  );

  if (plan.type === "noop") return "skipped";

  if (plan.type === "create") {
    await prisma.directoryMember.create({
      data: {
        gamertag: parsed.gamertag,
        displayName: parsed.displayName,
        phone: parsed.phone,
        phoneCountry: parsed.phoneCountry,
        active: true,
        leftAt: null,
        userId,
      },
    });
    return "created";
  }

  await prisma.directoryMember.updateMany({
    where: { id: plan.memberId, userId },
    data: {
      leftAt: null,
      active: true,
      absentWithCause: false,
      absentReason: null,
      activeHoldFromMc: true,
    },
  });
  if (existing) {
    await cancelPendingAllowlistRemoval(userId, existing.gamertag);
  }
  return "restored";
}

async function applyLeave(
  userId: string,
  members: DirectoryRow[],
  parsed: NonNullable<ReturnType<typeof parseParticipant>>,
): Promise<"left" | "skipped"> {
  const existing = findMemberByPhone(members, parsed.phone);
  const plan = planWhatsAppRosterChange(
    existing
      ? { id: existing.id, leftAt: existing.leftAt }
      : null,
    "leave",
  );
  if (plan.type !== "mark_left" || !existing) return "skipped";

  await prisma.directoryMember.updateMany({
    where: { id: plan.memberId, userId },
    data: {
      leftAt: new Date(),
      active: false,
      allowlistAddPending: false,
      absentWithCause: false,
      absentReason: null,
    },
  });
  await enqueueAllowlistRemovalForMember(userId, existing);
  return "left";
}

export async function applyWspBotEvent(input: {
  action: RosterEvent;
  participant: WspBotParticipant;
}): Promise<{ ok: true; result: string } | { error: string; status: number }> {
  const userId = await resolveBotDirectoryUserId();
  if (!userId) {
    return { error: "No hay usuario del directorio", status: 503 };
  }
  const parsed = parseParticipant(input.participant);
  if (!parsed) {
    return { error: "JID o teléfono inválido", status: 400 };
  }
  const members = await loadMembers(userId);
  const result =
    input.action === "join"
      ? await applyJoin(userId, members, parsed)
      : await applyLeave(userId, members, parsed);
  return { ok: true, result };
}

export async function applyWspBotSync(input: {
  participants: WspBotParticipant[];
  markMissingAsLeft?: boolean;
}): Promise<
  | {
      ok: true;
      created: number;
      restored: number;
      left: number;
      skipped: number;
    }
  | { error: string; status: number }
> {
  const userId = await resolveBotDirectoryUserId();
  if (!userId) {
    return { error: "No hay usuario del directorio", status: 503 };
  }

  let created = 0;
  let restored = 0;
  let left = 0;
  let skipped = 0;

  for (const p of input.participants) {
    const parsed = parseParticipant(p);
    if (!parsed) {
      skipped++;
      continue;
    }
    const members = await loadMembers(userId);
    const result = await applyJoin(userId, members, parsed);
    if (result === "created") created++;
    else if (result === "restored") restored++;
    else skipped++;
  }

  if (input.markMissingAsLeft) {
    const members = await loadMembers(userId);
    for (const row of members) {
      if (row.leftAt != null) continue;
      const stillHere = input.participants.some((p) => {
        const parsed = parseParticipant(p);
        return parsed ? phonesLikelySame(row.phone, parsed.phone) : false;
      });
      if (stillHere) continue;
      const result = await applyLeave(userId, [row], {
        phone: row.phone,
        phoneCountry: null,
        digits: row.phone.replace(/\D/g, ""),
        gamertag: row.gamertag,
        displayName: null,
      });
      if (result === "left") left++;
    }
  }

  return { ok: true, created, restored, left, skipped };
}
