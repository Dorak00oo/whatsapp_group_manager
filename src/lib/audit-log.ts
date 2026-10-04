import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  isAuditAction,
  type AuditAction,
  type AuditActor,
  type AuditChanges,
} from "@/lib/audit-format";

export {
  SYSTEM_ACTOR,
  diffAuditChanges,
  type AuditAction,
  type AuditActor,
  type AuditChanges,
} from "@/lib/audit-format";

export type AuditEventInput = {
  /** Dueño interno de los datos (User comunitario), igual que `DirectoryMember.userId`. */
  userId: string;
  actor: AuditActor;
  action: AuditAction | (string & {});
  memberId?: string | null;
  /** Copia del gamertag al momento del evento (sobrevive al borrado). */
  memberGamertag?: string | null;
  changes?: AuditChanges | null;
  details?: Record<string, unknown> | null;
};

/** JSON plano: fechas a ISO, sin `undefined`. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toRow(input: AuditEventInput): Prisma.AuditEventCreateManyInput {
  const a = input.actor;
  return {
    userId: input.userId,
    actorType: a.actorType,
    actorGamertag:
      a.actorType === "sistema" ? null : a.actorGamertag?.trim() || null,
    actorPhone: a.actorType === "bot" ? a.actorPhone?.trim() || null : null,
    actorName: a.actorType === "panel" ? null : a.actorName?.trim() || null,
    action: input.action,
    memberId: input.memberId ?? null,
    memberGamertag: input.memberGamertag?.trim() || null,
    changes: toJson(input.changes),
    details: toJson(input.details),
  };
}

/**
 * Registra un evento del historial. Nunca lanza: un fallo al auditar no
 * rompe la acción principal (solo `console.error`). No usar dentro de una
 * transacción: un error abortaría la transacción entera en Postgres.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({ data: toRow(input) });
  } catch (e) {
    console.error("[audit] no se pudo registrar el evento", {
      action: input.action,
      memberId: input.memberId ?? null,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Igual que {@link recordAuditEvent} pero en lote (importaciones). */
export async function recordAuditEvents(inputs: AuditEventInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.auditEvent.createMany({ data: inputs.map(toRow) });
  } catch (e) {
    console.error("[audit] no se pudo registrar el lote", {
      count: inputs.length,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/** No hay tope de filas: Postgres guarda todos los eventos. La página muestra 100. */
export const AUDIT_PAGE_SIZE = 100;

export type AuditFilters = {
  /** Id exacto (`?member=<id>`, enlace «Ver historial»). */
  memberId: string | null;
  /** Texto en el gamertag del miembro. */
  memberQuery: string;
  /** Texto en gamertag, nombre o teléfono del actor. */
  actorQuery: string;
  action: AuditAction | null;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseAuditFilters(params: RawParams): AuditFilters {
  const action = first(params.action);
  const page = Number.parseInt(first(params.page), 10);
  return {
    memberId: first(params.member).slice(0, 64) || null,
    memberQuery: first(params.mq).slice(0, 80),
    actorQuery: first(params.actor).slice(0, 80),
    action: isAuditAction(action) ? action : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function auditFiltersToSearchParams(f: Partial<AuditFilters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.memberId) p.set("member", f.memberId);
  if (f.memberQuery) p.set("mq", f.memberQuery);
  if (f.actorQuery) p.set("actor", f.actorQuery);
  if (f.action) p.set("action", f.action);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p;
}

function whereFor(userId: string, f: AuditFilters): Prisma.AuditEventWhereInput {
  const and: Prisma.AuditEventWhereInput[] = [{ userId }];
  if (f.memberId) and.push({ memberId: f.memberId });
  if (f.memberQuery) {
    and.push({ memberGamertag: { contains: f.memberQuery, mode: "insensitive" } });
  }
  if (f.actorQuery) {
    and.push({
      OR: [
        { actorGamertag: { contains: f.actorQuery, mode: "insensitive" } },
        { actorName: { contains: f.actorQuery, mode: "insensitive" } },
        { actorPhone: { contains: f.actorQuery } },
      ],
    });
  }
  if (f.action) and.push({ action: f.action });
  return { AND: and };
}

export type AuditEventRow = {
  id: string;
  createdAt: Date;
  actorType: string;
  actorGamertag: string | null;
  actorPhone: string | null;
  actorName: string | null;
  action: string;
  memberId: string | null;
  memberGamertag: string | null;
  changes: Prisma.JsonValue | null;
  details: Prisma.JsonValue | null;
};

export async function listAuditEvents(
  userId: string,
  filters: AuditFilters,
): Promise<{ rows: AuditEventRow[]; total: number; page: number; totalPages: number }> {
  const where = whereFor(userId, filters);
  const total = await prisma.auditEvent.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
    select: {
      id: true,
      createdAt: true,
      actorType: true,
      actorGamertag: true,
      actorPhone: true,
      actorName: true,
      action: true,
      memberId: true,
      memberGamertag: true,
      changes: true,
      details: true,
    },
  });
  return { rows, total, page, totalPages };
}
