export type AuditActorType = "panel" | "bot" | "sistema";

export type AuditActor =
  | { actorType: "panel"; actorGamertag: string }
  | {
      actorType: "bot";
      actorGamertag?: string | null;
      actorPhone?: string | null;
      actorName?: string | null;
    }
  | { actorType: "sistema"; actorName?: string | null };

export const SYSTEM_ACTOR: AuditActor = { actorType: "sistema" };

/** `{ campo: { from, to } }` — solo campos que cambiaron. */
export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

export const AUDIT_ACTIONS = [
  "member.create",
  "member.update",
  "member.delete",
  "strike.add",
  "strike.remove",
  "ban.set",
  "bot.join",
  "bot.rejoin",
  "bot.leave",
  "bot.sync",
  "mc.sync",
  "csv.import",
  "remote.cmd",
  "account.add",
  "account.remove",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const ACTION_LABELS: Record<AuditAction, string> = {
  "member.create": "Alta",
  "member.update": "Edición",
  "member.delete": "Eliminación",
  "strike.add": "Strike",
  "strike.remove": "Strike quitado",
  "ban.set": "Ban",
  "bot.join": "Entrada a WhatsApp",
  "bot.rejoin": "Reingreso a WhatsApp",
  "bot.leave": "Salida de WhatsApp",
  "bot.sync": "Sync de WhatsApp",
  "mc.sync": "Sync de Minecraft",
  "csv.import": "Importación CSV",
  "remote.cmd": "Comando remoto",
  "account.add": "Cuenta agregada",
  "account.remove": "Cuenta quitada",
};

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function auditActionLabel(action: string): string {
  return isAuditAction(action) ? ACTION_LABELS[action] : action;
}

export const AUDIT_ACTION_OPTIONS: { value: AuditAction; label: string }[] =
  AUDIT_ACTIONS.map((value) => ({ value, label: ACTION_LABELS[value] }));

export function auditActorTypeLabel(actorType: string): string {
  if (actorType === "panel") return "Panel";
  if (actorType === "bot") return "WhatsApp";
  if (actorType === "sistema") return "Sistema";
  return actorType;
}

const FIELD_LABELS: Record<string, string> = {
  gamertag: "el gamertag",
  displayName: "el nombre",
  age: "la edad",
  phone: "el teléfono",
  phoneCountry: "el país",
  whatsappUsername: "el usuario de WhatsApp",
  situation: "la situación",
  active: "la situación",
  permanentlyActive: "activo permanente",
  permanentlyActiveUntil: "la protección de nuevo",
  absentWithCause: "ausente con causa",
  absentReason: "la causa de ausencia",
  isAdmin: "admin",
  banExempt: "la protección contra ban",
  banned: "el ban",
  bannedReason: "el motivo del ban",
  leftAt: "la salida",
  notes: "la nota",
};

export function auditFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

const MAX_VALUE_CHARS = 48;
const MAX_CHANGES_IN_LINE = 3;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function shorten(s: string): string {
  return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS - 1)}…` : s;
}

export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "active" && typeof value === "boolean") {
    return value ? "activo" : "inactivo";
  }
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    return ISO_DATE.test(value) ? value.slice(0, 10) : shorten(value);
  }
  if (typeof value === "number") return String(value);
  return shorten(JSON.stringify(value));
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date || b instanceof Date) return false;
  const na = a === undefined || a === "" ? null : a;
  const nb = b === undefined || b === "" ? null : b;
  return na === nb;
}

/** Arma `changes` comparando antes/después; omite campos sin cambio real. */
export function diffAuditChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  fields: readonly (keyof T & string)[],
): AuditChanges | null {
  const out: AuditChanges = {};
  for (const f of fields) {
    if (!(f in after)) continue;
    if (!sameValue(before[f], after[f])) {
      out[f] = { from: before[f] ?? null, to: after[f] ?? null };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type AuditEventView = {
  action: string;
  actorType: string;
  actorGamertag: string | null;
  actorPhone: string | null;
  actorName: string | null;
  memberGamertag: string | null;
  changes: unknown;
  details: unknown;
};

export type AuditLinePart = { kind: "actor" | "member" | "text"; value: string };

export type AuditLine = { text: string; parts: AuditLinePart[] };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function readChanges(v: unknown): [string, { from: unknown; to: unknown }][] {
  const rec = asRecord(v);
  if (!rec) return [];
  const out: [string, { from: unknown; to: unknown }][] = [];
  for (const [field, raw] of Object.entries(rec)) {
    const c = asRecord(raw);
    if (c && ("from" in c || "to" in c)) out.push([field, { from: c.from, to: c.to }]);
  }
  return out;
}

function text(details: Record<string, unknown> | null, key: string): string | null {
  const v = details?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function count(details: Record<string, unknown> | null, key: string): number | null {
  const v = details?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatPhone(phone: string): string {
  const p = phone.trim();
  return p.startsWith("+") ? p : `+${p}`;
}

/** Nombre visible del actor; `null` si es el sistema sin nombre. */
export function auditActorName(e: Pick<AuditEventView, "actorType" | "actorGamertag" | "actorPhone" | "actorName">): string | null {
  if (e.actorType === "panel") return e.actorGamertag?.trim() || "Una cuenta del panel";
  if (e.actorType === "bot") {
    return (
      e.actorGamertag?.trim() ||
      e.actorName?.trim() ||
      (e.actorPhone?.trim() ? formatPhone(e.actorPhone) : null) ||
      "Un admin de WhatsApp"
    );
  }
  return e.actorName?.trim() || null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function countsSummary(details: Record<string, unknown> | null): string | null {
  const bits: string[] = [];
  const created = count(details, "created");
  const restored = count(details, "restored");
  const left = count(details, "left");
  const updated = count(details, "updated");
  const skipped = count(details, "skipped");
  if (created !== null) bits.push(plural(created, "alta", "altas"));
  if (restored !== null) bits.push(plural(restored, "reingreso", "reingresos"));
  if (left !== null) bits.push(plural(left, "salida", "salidas"));
  if (updated !== null) bits.push(plural(updated, "cambio", "cambios"));
  if (skipped !== null) bits.push(plural(skipped, "saltada", "saltadas"));
  return bits.length > 0 ? bits.join(", ") : null;
}

function changesSummary(changes: [string, { from: unknown; to: unknown }][]): string {
  const shown = changes.slice(0, MAX_CHANGES_IN_LINE).map(
    ([f, c]) => `${auditFieldLabel(f)} ${formatAuditValue(f, c.from)} → ${formatAuditValue(f, c.to)}`,
  );
  const rest = changes.length - shown.length;
  return rest > 0 ? `${shown.join(" · ")} · y ${rest} más` : shown.join(" · ");
}

class LineBuilder {
  parts: AuditLinePart[] = [];
  t(value: string) {
    if (value) this.parts.push({ kind: "text", value });
    return this;
  }
  actor(value: string) {
    this.parts.push({ kind: "actor", value });
    return this;
  }
  member(value: string) {
    this.parts.push({ kind: "member", value });
    return this;
  }
  done(): AuditLine {
    return { parts: this.parts, text: this.parts.map((p) => p.value).join("") };
  }
}

/** Línea legible en español para el historial. Acciones desconocidas usan un texto genérico. */
export function describeAuditEvent(e: AuditEventView): AuditLine {
  const b = new LineBuilder();
  const actor = auditActorName(e);
  const member = e.memberGamertag?.trim() || null;
  const details = asRecord(e.details);
  const changes = readChanges(e.changes);

  const who = () => (actor ? b.actor(actor) : b.t("El sistema"));
  const target = (fallback = "un miembro") => (member ? b.member(member) : b.t(fallback));

  switch (e.action) {
    case "member.create": {
      who().t(" agregó a ");
      target("una persona");
      const source = text(details, "source");
      if (source === "csv") b.t(" desde un CSV");
      else if (source === "whatsapp") b.t(" desde WhatsApp");
      else if (source === "formulario") b.t(" desde el formulario");
      return b.done();
    }
    case "member.update": {
      if (changes.length === 1) {
        const [field, c] = changes[0];
        who().t(` cambió ${auditFieldLabel(field)} de `);
        target();
        return b.t(`: ${formatAuditValue(field, c.from)} → ${formatAuditValue(field, c.to)}`).done();
      }
      who().t(" editó a ");
      target();
      return changes.length > 0 ? b.t(`: ${changesSummary(changes)}`).done() : b.done();
    }
    case "member.delete":
      who().t(" eliminó a ");
      return target().done();
    case "strike.add": {
      who().t(" le puso un strike a ");
      target();
      const reason = text(details, "reason");
      return reason ? b.t(`: ${reason}`).done() : b.done();
    }
    case "strike.remove":
      who().t(" le quitó un strike a ");
      return target().done();
    case "ban.set": {
      const banned = changes.find(([f]) => f === "banned")?.[1].to ?? details?.banned;
      if (banned === false) {
        who().t(" le quitó el ban a ");
        return target().done();
      }
      who().t(" baneó a ");
      target();
      const reason = text(details, "reason");
      return reason ? b.t(`: ${reason}`).done() : b.done();
    }
    case "bot.join":
    case "bot.rejoin": {
      const again = e.action === "bot.rejoin" || details?.restored === true;
      if (actor) {
        b.actor(actor).t(again ? " volvió a agregar a " : " agregó a ");
        return target().t(" desde WhatsApp").done();
      }
      target();
      return b.t(again ? " volvió al grupo de WhatsApp" : " entró al grupo de WhatsApp").done();
    }
    case "bot.leave":
      if (actor) {
        b.actor(actor).t(" marcó la salida de ");
        return target().t(" desde WhatsApp").done();
      }
      target();
      return b.t(" salió del grupo de WhatsApp").done();
    case "bot.sync": {
      who().t(" sincronizó el grupo de WhatsApp");
      const summary = countsSummary(details);
      return summary ? b.t(`: ${summary}`).done() : b.done();
    }
    case "mc.sync": {
      if (member && changes.length > 0) {
        b.t("La sync con Minecraft cambió ");
        if (changes.length === 1) {
          const [field, c] = changes[0];
          b.t(`${auditFieldLabel(field)} de `).member(member);
          return b.t(`: ${formatAuditValue(field, c.from)} → ${formatAuditValue(field, c.to)}`).done();
        }
        return b.t("a ").member(member).t(`: ${changesSummary(changes)}`).done();
      }
      who().t(" sincronizó con Minecraft");
      const summary = countsSummary(details);
      return summary ? b.t(`: ${summary}`).done() : b.done();
    }
    case "csv.import": {
      who().t(" importó un CSV");
      const summary = countsSummary(details);
      return summary ? b.t(`: ${summary}`).done() : b.done();
    }
    case "remote.cmd": {
      const label = text(details, "label") ?? text(details, "command");
      who().t(label ? ` envió «${label}»` : " envió un comando remoto");
      if (member) b.t(" a ").member(member);
      const destination = text(details, "destination");
      if (destination) b.t(` → ${destination}`);
      const world = text(details, "world");
      return world ? b.t(` en ${world}`).done() : b.done();
    }
    case "account.add":
      who().t(" le dio cuenta del panel a ");
      return target().done();
    case "account.remove":
      who().t(" le quitó la cuenta del panel a ");
      return target().done();
    default: {
      who().t(` hizo «${e.action}»`);
      if (member) b.t(" sobre ").member(member);
      return changes.length > 0 ? b.t(`: ${changesSummary(changes)}`).done() : b.done();
    }
  }
}
