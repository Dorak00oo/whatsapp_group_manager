import type { AuditActor } from "@/lib/audit-format";
import { normalizeWhatsAppUsername } from "@/lib/whatsapp-username";
import { normalizeWhatsAppPhoneInput } from "@/lib/whatsapp-phone-normalize";
import {
  findMemberByPhone,
  findMemberByUsername,
} from "@/lib/wsp-bot-directory";

export const WHATSAPP_BOT_SYSTEM_ACTOR: AuditActor = {
  actorType: "sistema",
  actorName: "Bot de WhatsApp",
};

export type WspBotActorFields = {
  jid?: string;
  username?: string;
  name?: string;
};

export type ActorDirectoryRow = {
  gamertag: string;
  phone: string | null;
  whatsappUsername?: string | null;
};

/**
 * `actor` opcional del bot. Si falta o viene mal formado, devuelve null
 * (el alta sigue; el historial usa el actor de sistema).
 */
export function parseWspBotActor(raw: unknown): WspBotActorFields | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const jid = typeof o.jid === "string" ? o.jid.trim() : "";
  const username = typeof o.username === "string" ? o.username.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!jid && !username && !name) return null;
  return {
    ...(jid ? { jid } : {}),
    ...(username ? { username } : {}),
    ...(name ? { name } : {}),
  };
}

/** Gamertag del directorio por teléfono (521 de México incluido) y luego por @usuario. */
export function botAuditActorFromDirectory(
  actor: WspBotActorFields | null,
  members: ActorDirectoryRow[],
): AuditActor {
  if (!actor) return WHATSAPP_BOT_SYSTEM_ACTOR;

  const phoneParsed = actor.jid ? normalizeWhatsAppPhoneInput(actor.jid) : null;
  const phone = phoneParsed && phoneParsed.ok ? phoneParsed.phone : null;
  const usernameParsed = actor.username
    ? normalizeWhatsAppUsername(actor.username)
    : null;
  const username = usernameParsed && usernameParsed.ok ? usernameParsed.username : null;

  const match =
    (phone ? findMemberByPhone(members, phone) : undefined) ??
    (username ? findMemberByUsername(members, username) : undefined);

  return {
    actorType: "bot",
    ...(match?.gamertag ? { actorGamertag: match.gamertag } : {}),
    ...(phone ? { actorPhone: phone } : {}),
    ...(actor.name ? { actorName: actor.name } : {}),
  };
}
