import {
  cancelPendingAllowlistRemoval,
  enqueueAllowlistRemovalForMember,
} from "@/lib/allowlist-removal";
import { parseDirectoryAge } from "@/lib/directory-age";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
import { normalizeWhatsAppPhoneInput } from "@/lib/whatsapp-phone-normalize";
import { normalizeWhatsAppUsername } from "@/lib/whatsapp-username";
import {
  displayNameForRestore,
  explicitJoinGamertag,
  findMemberByWhatsAppIdentity,
  planWhatsAppRosterChange,
  type RosterEvent,
} from "@/lib/wsp-bot-directory";

export type WspBotParticipant = {
  jid?: string;
  username?: string;
  name?: string;
  gamertag?: string;
  age?: number;
};

type DirectoryRow = {
  id: string;
  phone: string | null;
  whatsappUsername: string | null;
  gamertag: string;
  displayName: string | null;
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
        whatsappUsername: true,
        gamertag: true,
        displayName: true,
        leftAt: true,
        allowlistSyncedAt: true,
        allowlistRemovedAt: true,
      },
    }),
  );
}

function parseParticipant(p: WspBotParticipant) {
  const usernameN = normalizeWhatsAppUsername(p.username ?? "");
  const username = usernameN.ok ? usernameN.username : null;
  const jid = (p.jid ?? "").trim();
  const phoneParsed = jid ? normalizeWhatsAppPhoneInput(jid) : null;
  const phone = phoneParsed?.ok ? phoneParsed.phone : null;
  const phoneCountry = phoneParsed?.ok ? phoneParsed.phoneCountry : null;
  if (!phone && !username) return null;
  const digits = phone ? phone.replace(/\D/g, "") : username ?? "user";
  const ageParsed = parseDirectoryAge(p.age);
  return {
    phone,
    phoneCountry,
    username,
    digits,
    gamertag: explicitJoinGamertag(p.gamertag),
    displayName: (p.name ?? "").trim() || null,
    age: ageParsed.ok ? ageParsed.age : null,
  };
}

function identityFill(
  existing: DirectoryRow,
  parsed: NonNullable<ReturnType<typeof parseParticipant>>,
) {
  const data: {
    phone?: string | null;
    phoneCountry?: string | null;
    whatsappUsername?: string | null;
    displayName?: string | null;
  } = {};
  if (!existing.phone && parsed.phone) {
    data.phone = parsed.phone;
    data.phoneCountry = parsed.phoneCountry;
  }
  if (!existing.whatsappUsername && parsed.username) {
    data.whatsappUsername = parsed.username;
  }
  const displayName = displayNameForRestore(
    existing.displayName,
    parsed.displayName,
  );
  if (displayName !== undefined) data.displayName = displayName;
  return data;
}

async function applyJoin(
  userId: string,
  members: DirectoryRow[],
  parsed: NonNullable<ReturnType<typeof parseParticipant>>,
): Promise<"created" | "restored" | "skipped"> {
  const existing = findMemberByWhatsAppIdentity(members, {
    phone: parsed.phone,
    username: parsed.username,
  });
  const plan = planWhatsAppRosterChange(
    existing
      ? { id: existing.id, leftAt: existing.leftAt }
      : null,
    "join",
  );

  if (plan.type === "noop") return "skipped";

  if (plan.type === "create") {
    if (!parsed.gamertag) return "skipped";
    await prisma.directoryMember.create({
      data: {
        gamertag: parsed.gamertag,
        displayName: parsed.displayName,
        age: parsed.age,
        phone: parsed.phone,
        phoneCountry: parsed.phoneCountry,
        whatsappUsername: parsed.username,
        active: true,
        leftAt: null,
        userId,
      },
    });
    return "created";
  }

  const fill = existing ? identityFill(existing, parsed) : {};
  await prisma.directoryMember.updateMany({
    where: { id: plan.memberId, userId },
    data: {
      leftAt: null,
      active: true,
      absentWithCause: false,
      absentReason: null,
      activeHoldFromMc: true,
      ...fill,
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
  const existing = findMemberByWhatsAppIdentity(members, {
    phone: parsed.phone,
    username: parsed.username,
  });
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
    return { error: "Falta teléfono o usuario de WhatsApp", status: 400 };
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
        if (!parsed) return false;
        return Boolean(
          findMemberByWhatsAppIdentity([row], {
            phone: parsed.phone,
            username: parsed.username,
          }),
        );
      });
      if (stillHere) continue;
      const result = await applyLeave(userId, [row], {
        phone: row.phone,
        phoneCountry: null,
        username: row.whatsappUsername,
        digits: (row.phone ?? "").replace(/\D/g, "") || row.whatsappUsername || "user",
        gamertag: row.gamertag,
        displayName: null,
        age: null,
      });
      if (result === "left") left++;
    }
  }

  return { ok: true, created, restored, left, skipped };
}
