import {
  recordAuditEvent,
  recordAuditEvents,
  type AuditEventInput,
} from "@/lib/audit-log";
import type { AuditActor } from "@/lib/audit-format";
import {
  cancelPendingAllowlistRemoval,
  enqueueAllowlistRemovalForMember,
} from "@/lib/allowlist-removal";
import { parseDirectoryAge } from "@/lib/directory-age";
import { newMemberProtectionUntil } from "@/lib/directory-protection";
import { fieldsForLeavingGroup } from "@/lib/directory-situation";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
import {
  botAuditActorFromDirectory,
  parseWspBotActor,
  type WspBotActorFields,
} from "@/lib/wsp-bot-actor";
import { normalizeWhatsAppPhoneInput } from "@/lib/whatsapp-phone-normalize";
import { normalizeWhatsAppUsername } from "@/lib/whatsapp-username";
import {
  explicitJoinGamertag,
  fillEmptyWhatsAppIdentity,
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

type ParsedParticipant = {
  phone: string | null;
  phoneCountry: string | null;
  username: string | null;
  digits: string;
  gamertag: string | null;
  displayName: string | null;
  age: number | null;
};

type JoinOutcome =
  | { kind: "created"; memberId: string; gamertag: string }
  | { kind: "restored"; memberId: string; gamertag: string }
  | { kind: "skipped" };

type LeaveOutcome =
  | { kind: "left"; memberId: string; gamertag: string }
  | { kind: "skipped" };

async function resolveBotDirectoryUserId(): Promise<string | null> {
  const { findCommunityOwner } = await import("@/lib/resolve-directory-user");
  const owner = await findCommunityOwner();
  return owner?.id ?? null;
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

export function parseParticipant(
  p: WspBotParticipant,
): ParsedParticipant | null {
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

function identityFill(existing: DirectoryRow, parsed: ParsedParticipant) {
  return fillEmptyWhatsAppIdentity(existing, parsed);
}

async function applyJoin(
  userId: string,
  members: DirectoryRow[],
  parsed: ParsedParticipant,
): Promise<JoinOutcome> {
  const existing = findMemberByWhatsAppIdentity(members, {
    phone: parsed.phone,
    username: parsed.username,
  });
  const plan = planWhatsAppRosterChange(
    existing ? { id: existing.id, leftAt: existing.leftAt } : null,
    "join",
  );

  if (plan.type === "noop") {
    if (existing) {
      const fill = identityFill(existing, parsed);
      if (Object.keys(fill).length > 0) {
        await prisma.directoryMember.updateMany({
          where: { id: existing.id, userId },
          data: fill,
        });
        if (fill.phone !== undefined) existing.phone = fill.phone ?? null;
        if (fill.whatsappUsername !== undefined) {
          existing.whatsappUsername = fill.whatsappUsername ?? null;
        }
        if (fill.displayName !== undefined) {
          existing.displayName = fill.displayName ?? null;
        }
      }
    }
    return { kind: "skipped" };
  }

  if (plan.type === "create") {
    if (!parsed.gamertag) return { kind: "skipped" };
    const createdAt = new Date();
    const created = await prisma.directoryMember.create({
      data: {
        gamertag: parsed.gamertag,
        displayName: parsed.displayName,
        age: parsed.age,
        phone: parsed.phone,
        phoneCountry: parsed.phoneCountry,
        whatsappUsername: parsed.username,
        active: true,
        leftAt: null,
        activeHoldFromMc: false,
        permanentlyActiveUntil: newMemberProtectionUntil(createdAt),
        createdAt,
        userId,
      },
      select: {
        id: true,
        phone: true,
        whatsappUsername: true,
        gamertag: true,
        displayName: true,
      },
    });
    members.push({
      id: created.id,
      phone: created.phone,
      whatsappUsername: created.whatsappUsername,
      gamertag: created.gamertag,
      displayName: created.displayName,
      leftAt: null,
      allowlistSyncedAt: null,
      allowlistRemovedAt: null,
    });
    return { kind: "created", memberId: created.id, gamertag: created.gamertag };
  }

  const fill = existing ? identityFill(existing, parsed) : {};
  await prisma.directoryMember.updateMany({
    where: { id: plan.memberId, userId },
    data: {
      leftAt: null,
      active: true,
      absentWithCause: false,
      absentReason: null,
      absentActiveSince: null,
      activeHoldFromMc: true,
      ...fill,
    },
  });
  if (existing) {
    existing.leftAt = null;
    if (fill.phone !== undefined) existing.phone = fill.phone ?? null;
    if (fill.whatsappUsername !== undefined) {
      existing.whatsappUsername = fill.whatsappUsername ?? null;
    }
    if (fill.displayName !== undefined) {
      existing.displayName = fill.displayName ?? null;
    }
    await cancelPendingAllowlistRemoval(userId, existing.gamertag);
    return {
      kind: "restored",
      memberId: existing.id,
      gamertag: existing.gamertag,
    };
  }
  return { kind: "skipped" };
}

async function applyLeave(
  userId: string,
  members: DirectoryRow[],
  parsed: ParsedParticipant,
): Promise<LeaveOutcome> {
  const existing = findMemberByWhatsAppIdentity(members, {
    phone: parsed.phone,
    username: parsed.username,
  });
  const plan = planWhatsAppRosterChange(
    existing ? { id: existing.id, leftAt: existing.leftAt } : null,
    "leave",
  );
  if (plan.type !== "mark_left" || !existing) return { kind: "skipped" };

  await prisma.directoryMember.updateMany({
    where: { id: plan.memberId, userId },
    data: fieldsForLeavingGroup(new Date()),
  });
  existing.leftAt = new Date();
  await enqueueAllowlistRemovalForMember(userId, existing);
  return { kind: "left", memberId: existing.id, gamertag: existing.gamertag };
}

function auditForOutcome(
  userId: string,
  actor: AuditActor,
  outcome: JoinOutcome | LeaveOutcome,
): AuditEventInput | null {
  if (outcome.kind === "skipped") return null;
  if (outcome.kind === "created") {
    return {
      userId,
      actor,
      action: "bot.join",
      memberId: outcome.memberId,
      memberGamertag: outcome.gamertag,
      details: { restored: false },
    };
  }
  if (outcome.kind === "restored") {
    return {
      userId,
      actor,
      action: "bot.rejoin",
      memberId: outcome.memberId,
      memberGamertag: outcome.gamertag,
      details: { restored: true },
    };
  }
  return {
    userId,
    actor,
    action: "bot.leave",
    memberId: outcome.memberId,
    memberGamertag: outcome.gamertag,
  };
}

export function actorForBotRequest(
  actor: WspBotActorFields | null | undefined,
  members: DirectoryRow[],
): AuditActor {
  return botAuditActorFromDirectory(actor ?? null, members);
}

export async function applyWspBotEvent(input: {
  action: RosterEvent;
  participant: WspBotParticipant;
  actor?: unknown;
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
  const actor = actorForBotRequest(parseWspBotActor(input.actor), members);
  const outcome =
    input.action === "join"
      ? await applyJoin(userId, members, parsed)
      : await applyLeave(userId, members, parsed);
  const event = auditForOutcome(userId, actor, outcome);
  if (event) await recordAuditEvent(event);
  return { ok: true, result: outcome.kind === "skipped" ? "skipped" : outcome.kind };
}

export async function applyWspBotSync(input: {
  participants: WspBotParticipant[];
  markMissingAsLeft?: boolean;
  actor?: unknown;
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

  const members = await loadMembers(userId);
  const actor = actorForBotRequest(parseWspBotActor(input.actor), members);
  const events: AuditEventInput[] = [];

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
    const outcome = await applyJoin(userId, members, parsed);
    if (outcome.kind === "created") created++;
    else if (outcome.kind === "restored") restored++;
    else skipped++;
    const event = auditForOutcome(userId, actor, outcome);
    if (event) events.push(event);
  }

  if (input.markMissingAsLeft) {
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
      const outcome = await applyLeave(userId, [row], {
        phone: row.phone,
        phoneCountry: null,
        username: row.whatsappUsername,
        digits: (row.phone ?? "").replace(/\D/g, "") || row.whatsappUsername || "user",
        gamertag: row.gamertag,
        displayName: null,
        age: null,
      });
      if (outcome.kind === "left") {
        left++;
        const event = auditForOutcome(userId, actor, outcome);
        if (event) events.push(event);
      }
    }
  }

  events.push({
    userId,
    actor,
    action: "bot.sync",
    details: { created, restored, left, skipped },
  });
  await recordAuditEvents(events);

  return { ok: true, created, restored, left, skipped };
}
