import type { Prisma } from "@/generated/prisma";
import {
  DIRECTORY_NEW_MEMBER_DAYS,
  parseDirectoryCohort,
  type DirectoryCohort,
} from "@/lib/directory-cohort";
export type { DirectoryCohort };

export type DirectoryUrlFilters = {
  status: "all" | "active" | "inactive";
  view: "single" | "split";
  cohort: DirectoryCohort;
  country: string;
  q: string;
  banned: "all" | "only";
};

/** Serializa filtros a query string (inverso coherente de `parseDirectoryFilters`). */
export function filtersToSearchParams(f: DirectoryUrlFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.cohort !== "all") p.set("cohort", f.cohort);
  if (f.status !== "all") p.set("status", f.status);
  if (f.view === "single") p.set("view", "single");
  if (f.country) p.set("country", f.country);
  if (f.q) p.set("q", f.q);
  if (f.banned === "only") p.set("banned", "only");
  return p;
}

export function parseDirectoryFilters(
  raw: Record<string, string | string[] | undefined>,
): DirectoryUrlFilters {
  const g = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = g("status");
  const view = g("view");
  const country = (g("country") ?? "").trim().toUpperCase();
  const q = (g("q") ?? "").trim();
  const banned = g("banned");
  const cohort = parseDirectoryCohort(g("cohort"));

  return {
    status:
      status === "active"
        ? "active"
        : status === "inactive"
          ? "inactive"
          : "all",
    view: view === "single" ? "single" : "split",
    cohort,
    country: country.length === 2 ? country : "",
    q,
    banned: banned === "only" ? "only" : "all",
  };
}

export function directoryMemberWhere(
  userId: string,
  filters: DirectoryUrlFilters,
  now: Date = new Date(),
): Prisma.DirectoryMemberWhereInput {
  const parts: Prisma.DirectoryMemberWhereInput[] = [{ userId }];

  if (filters.status === "active") parts.push({ active: true });
  if (filters.status === "inactive") parts.push({ active: false });
  if (filters.country) parts.push({ phoneCountry: filters.country });
  if (filters.banned === "only") parts.push({ banned: true });

  switch (filters.cohort) {
    case "admins":
      parts.push({ isAdmin: true });
      break;
    case "protected":
      parts.push({ banExempt: true });
      break;
    case "roster":
      parts.push({ active: true, leftAt: null });
      break;
    case "new": {
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);
      parts.push({ createdAt: { gte: cutoff }, leftAt: null });
      break;
    }
    case "inactive":
      parts.push({ active: false, leftAt: null });
      break;
    case "absent":
      parts.push({ absentWithCause: true, leftAt: null });
      break;
    case "left":
      parts.push({ leftAt: { not: null } });
      break;
    default:
      break;
  }

  const q = filters.q;
  if (q) {
    parts.push({
      OR: [
        { gamertag: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { notes: { contains: q, mode: "insensitive" } },
        { absentReason: { contains: q, mode: "insensitive" } },
        { bannedReason: { contains: q, mode: "insensitive" } },
        {
          strikes: {
            some: { reason: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  return { AND: parts };
}

/**
 * Misma base que la lista (grupo, país, búsqueda, baneos…) **sin** el filtro
 * «Estado» (solo activos / solo inactivos). Sirve para contar las tres franjas
 * del roster aunque la lista visible esté acotada por estado o vista.
 */
export function directoryMemberWhereIgnoringListStatus(
  userId: string,
  filters: DirectoryUrlFilters,
  now?: Date,
): Prisma.DirectoryMemberWhereInput {
  return directoryMemberWhere(userId, { ...filters, status: "all" }, now);
}

/** Tamaño de cada tanda de la lista (P5). */
export const DIRECTORY_PAGE_SIZE = 100;

/** Parámetros de filtro de la lista. Si llegan a `/dashboard`, se redirigen a `/dashboard/lista`. */
export const DIRECTORY_LIST_PARAM_KEYS = [
  "q",
  "cohort",
  "country",
  "status",
  "view",
  "banned",
] as const;

export function directoryListRedirectQuery(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const params = new URLSearchParams();
  for (const key of DIRECTORY_LIST_PARAM_KEYS) {
    const value = raw[key];
    const text = (Array.isArray(value) ? value[0] : value)?.trim();
    if (text) params.set(key, text);
  }
  const qs = params.toString();
  return qs.length > 0 ? qs : null;
}

export type DirectoryListMode = "split" | "tiered" | "created";

export type DirectoryColumnLane = "active" | "inactive" | "left";

export type DirectoryCursorScope = "list" | DirectoryColumnLane;

export type DirectoryPageCursor = {
  scope: DirectoryCursorScope;
  at: string;
  id: string;
};

const CURSOR_SCOPES = new Set<DirectoryCursorScope>([
  "list",
  "active",
  "inactive",
  "left",
]);

/**
 * Vista dividida (estado «todos»): cada columna pagina sola, por `createdAt`.
 * Lista única con estado «todos»: activos, luego inactivos, luego salidos
 * (los salidos por `leftAt`, como la lista de antes).
 * Cualquier otro filtro de estado: un solo orden por `createdAt`.
 * Siempre desempata con `id` descendente.
 */
export function directoryListMode(filters: DirectoryUrlFilters): DirectoryListMode {
  if (filters.view === "split" && filters.status === "all") return "split";
  if (filters.view === "single" && filters.status === "all") return "tiered";
  return "created";
}

export function directoryLaneWhere(
  lane: DirectoryColumnLane,
): Prisma.DirectoryMemberWhereInput {
  if (lane === "active") return { active: true, leftAt: null };
  if (lane === "inactive") return { active: false, leftAt: null };
  return { leftAt: { not: null } };
}

/** Campo de orden de un tramo. En la lista única, «se salieron» va por fecha de salida. */
export function directoryLaneField(
  mode: DirectoryListMode,
  scope: DirectoryCursorScope,
): "createdAt" | "leftAt" {
  if (mode === "tiered" && scope === "left") return "leftAt";
  return "createdAt";
}

export function directoryCursorWhere(
  field: "createdAt" | "leftAt",
  cursor: Pick<DirectoryPageCursor, "at" | "id">,
): Prisma.DirectoryMemberWhereInput {
  const at = new Date(cursor.at);
  if (field === "leftAt") {
    return {
      OR: [
        { leftAt: { lt: at } },
        { AND: [{ leftAt: { equals: at } }, { id: { lt: cursor.id } }] },
      ],
    };
  }
  return {
    OR: [
      { createdAt: { lt: at } },
      { AND: [{ createdAt: { equals: at } }, { id: { lt: cursor.id } }] },
    ],
  };
}

export function encodeDirectoryCursor(cursor: DirectoryPageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeDirectoryCursor(
  raw: string | null | undefined,
): DirectoryPageCursor | null {
  if (!raw || raw.length > 512) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<DirectoryPageCursor>;
    if (!data.scope || !CURSOR_SCOPES.has(data.scope)) return null;
    if (typeof data.id !== "string" || data.id.length === 0 || data.id.length > 64) {
      return null;
    }
    if (typeof data.at !== "string") return null;
    const at = new Date(data.at);
    if (Number.isNaN(at.getTime())) return null;
    return { scope: data.scope, at: at.toISOString(), id: data.id };
  } catch {
    return null;
  }
}

export function directoryCursorMatches(
  mode: DirectoryListMode,
  lane: DirectoryColumnLane | null,
  cursor: DirectoryPageCursor,
): boolean {
  if (mode === "created") return cursor.scope === "list";
  if (mode === "split") return lane != null && cursor.scope === lane;
  return cursor.scope === "active" || cursor.scope === "inactive" || cursor.scope === "left";
}

export type DirectorySortRow = {
  id: string;
  createdAt: Date;
  leftAt: Date | null;
  active: boolean;
};

function rowTime(row: DirectorySortRow, field: "createdAt" | "leftAt"): number | null {
  const value = field === "leftAt" ? row.leftAt : row.createdAt;
  if (!value) return null;
  const time = value.getTime();
  return Number.isNaN(time) ? null : time;
}

function inDirectoryLane(row: DirectorySortRow, lane: DirectoryColumnLane): boolean {
  if (lane === "left") return row.leftAt != null;
  if (row.leftAt) return false;
  return lane === "active" ? row.active : !row.active;
}

function isAfterCursor(time: number, id: string, cursor: DirectoryPageCursor): boolean {
  const at = new Date(cursor.at).getTime();
  if (time < at) return true;
  if (time > at) return false;
  return id < cursor.id;
}

function compareDirectoryOrder(
  aTime: number,
  aId: string,
  bTime: number,
  bId: string,
): number {
  if (aTime !== bTime) return bTime - aTime;
  if (aId === bId) return 0;
  return aId < bId ? 1 : -1;
}

function sliceOrdered<T extends DirectorySortRow>(
  rows: T[],
  scope: DirectoryCursorScope,
  field: "createdAt" | "leftAt",
  cursor: DirectoryPageCursor | null,
  take: number,
): { rows: T[]; nextCursor: DirectoryPageCursor | null } {
  const ordered = rows
    .map((row) => ({ row, time: rowTime(row, field) }))
    .filter((item): item is { row: T; time: number } => item.time != null)
    .filter((item) => {
      if (!cursor) return true;
      if (cursor.scope !== scope) return false;
      return isAfterCursor(item.time, item.row.id, cursor);
    })
    .sort((a, b) => compareDirectoryOrder(a.time, a.row.id, b.time, b.row.id));

  const page = ordered.slice(0, take);
  const last = page[page.length - 1];
  if (!last || ordered.length <= take) {
    return { rows: page.map((item) => item.row), nextCursor: null };
  }
  return {
    rows: page.map((item) => item.row),
    nextCursor: { scope, at: new Date(last.time).toISOString(), id: last.row.id },
  };
}

/**
 * Misma paginación que la consulta a la base, sobre filas ya cargadas.
 * Sirve para fijar el orden (y el desempate por `id`) en tests.
 */
export function takeDirectoryPage<T extends DirectorySortRow>(
  rows: T[],
  opts: {
    mode: DirectoryListMode;
    lane?: DirectoryColumnLane | null;
    cursor: DirectoryPageCursor | null;
    take: number;
  },
): { rows: T[]; nextCursor: DirectoryPageCursor | null } {
  const take = Math.max(0, opts.take);
  if (opts.mode === "created") {
    return sliceOrdered(rows, "list", "createdAt", opts.cursor, take);
  }
  if (opts.mode === "split") {
    const lane = opts.lane ?? "active";
    return sliceOrdered(
      rows.filter((row) => inDirectoryLane(row, lane)),
      lane,
      directoryLaneField("split", lane),
      opts.cursor,
      take,
    );
  }
  const lanes: DirectoryColumnLane[] = ["active", "inactive", "left"];
  let start = 0;
  if (opts.cursor && opts.cursor.scope !== "list") {
    const index = lanes.indexOf(opts.cursor.scope);
    if (index >= 0) start = index;
  }
  const out: T[] = [];
  for (let i = start; i < lanes.length && out.length < take; i++) {
    const lane = lanes[i];
    const page = sliceOrdered(
      rows.filter((row) => inDirectoryLane(row, lane)),
      lane,
      directoryLaneField("tiered", lane),
      i === start ? opts.cursor : null,
      take - out.length,
    );
    out.push(...page.rows);
    if (page.nextCursor) return { rows: out, nextCursor: page.nextCursor };
  }
  return { rows: out, nextCursor: null };
}

const HOME_COUNT_COHORT = {
  active: "roster",
  inactive: "inactive",
  new: "new",
  absent: "absent",
  left: "left",
} as const;

export type DirectoryHomeCountKey = keyof typeof HOME_COUNT_COHORT;

/** Conteos de Inicio con las mismas cohortes que los filtros de la lista. */
export function directoryHomeCountWhere(
  userId: string,
  key: DirectoryHomeCountKey,
  now: Date = new Date(),
): Prisma.DirectoryMemberWhereInput {
  return directoryMemberWhere(
    userId,
    {
      status: "all",
      view: "split",
      cohort: HOME_COUNT_COHORT[key],
      country: "",
      q: "",
      banned: "all",
    },
    now,
  );
}
