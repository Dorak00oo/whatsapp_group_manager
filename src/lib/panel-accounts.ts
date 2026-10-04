import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/prisma-retry";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import {
  findAccountByGamertag,
  gamertagKey,
  isPanelOwnerGamertag,
} from "@/lib/panel-credentials";

export async function findPanelAccountForLogin(
  userId: string,
  key: string,
): Promise<{ id: string; gamertag: string } | null> {
  const rows = await withDbRetry(() =>
    prisma.panelAccount.findMany({
      where: {
        userId,
        member: { gamertag: { equals: key, mode: "insensitive" } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, member: { select: { gamertag: true } } },
    }),
  );
  return findAccountByGamertag(
    rows.map((r) => ({ id: r.id, gamertag: r.member.gamertag })),
    key,
  );
}

export type PanelAccountSessionCheck =
  | { status: "valid"; gamertag: string }
  | { status: "invalid" }
  /** La base no respondió: se conserva la sesión en este request. */
  | { status: "unknown" };

/** Dedup de los `auth()` de un mismo request; quitar una cuenta borra su entrada al instante. */
const SESSION_CHECK_TTL_MS = 3_000;
const SESSION_CACHE_MAX = 500;
const CACHE_KEY = Symbol.for("wsp.panel.accountSessionCache");
const REVOKED_KEY = Symbol.for("wsp.panel.revokedAccounts");

type CacheEntry = { at: number; result: PanelAccountSessionCheck };

function sessionCache(): Map<string, CacheEntry> {
  const g = globalThis as { [CACHE_KEY]?: Map<string, CacheEntry> };
  g[CACHE_KEY] ??= new Map();
  return g[CACHE_KEY];
}

/** Ids quitados en este proceso: gana a una validación que ya estaba en vuelo. */
function revokedAccounts(): Set<string> {
  const g = globalThis as { [REVOKED_KEY]?: Set<string> };
  g[REVOKED_KEY] ??= new Set();
  return g[REVOKED_KEY];
}

function isTransientDbError(e: unknown): boolean {
  if (isDatabaseUnreachableError(e)) return true;
  const code = (e as { code?: unknown } | null)?.code;
  if (code === "P1002" || code === "P1017" || code === "P2024") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|Connection terminated|timeout/i.test(msg);
}

export async function checkPanelAccountSession(
  accountId: string,
  userId: string,
): Promise<PanelAccountSessionCheck> {
  if (revokedAccounts().has(accountId)) return { status: "invalid" };
  const cache = sessionCache();
  const now = Date.now();
  const hit = cache.get(accountId);
  if (hit && now - hit.at < SESSION_CHECK_TTL_MS) return hit.result;

  try {
    const row = await prisma.panelAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, member: { select: { gamertag: true } } },
    });
    const result: PanelAccountSessionCheck =
      row && row.userId === userId && !revokedAccounts().has(accountId)
        ? { status: "valid", gamertag: row.member.gamertag }
        : { status: "invalid" };
    cache.delete(accountId);
    cache.set(accountId, { at: now, result });
    if (cache.size > SESSION_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isTransientDbError(e)) {
      console.error("[panel-session] base no disponible al validar la cuenta; se conserva la sesión", { message });
      return { status: "unknown" };
    }
    console.error("[panel-session] error al validar la cuenta; se cierra la sesión", { message });
    return { status: "invalid" };
  }
}

export function revokePanelAccountSession(accountId: string): void {
  revokedAccounts().add(accountId);
  sessionCache().delete(accountId);
}

export type PanelAccountRow = {
  id: string;
  memberId: string;
  gamertag: string;
  displayName: string | null;
  isAdmin: boolean;
  leftAt: Date | null;
  createdAt: Date;
  createdBy: string;
};

export async function listPanelAccounts(userId: string): Promise<PanelAccountRow[]> {
  const rows = await prisma.panelAccount.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      createdBy: true,
      member: {
        select: {
          id: true,
          gamertag: true,
          displayName: true,
          isAdmin: true,
          leftAt: true,
        },
      },
    },
  });
  return rows
    .map((r) => ({
      id: r.id,
      memberId: r.member.id,
      gamertag: r.member.gamertag,
      displayName: r.member.displayName,
      isAdmin: r.member.isAdmin,
      leftAt: r.member.leftAt,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
    }))
    .sort((a, b) => a.gamertag.localeCompare(b.gamertag, "es", { sensitivity: "base" }));
}

export type PanelAccountCandidate = {
  id: string;
  gamertag: string;
  displayName: string | null;
  isAdmin: boolean;
};

/** Miembros que siguen en la comunidad, sin cuenta y que no son el dueño. */
export async function searchPanelAccountCandidates(
  userId: string,
  query: string,
  ownerGamertag: string,
  limit = 8,
): Promise<PanelAccountCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await prisma.directoryMember.findMany({
    where: {
      userId,
      leftAt: null,
      panelAccount: { is: null },
      gamertag: { contains: q, mode: "insensitive" },
    },
    orderBy: [{ isAdmin: "desc" }, { gamertag: "asc" }],
    take: limit + 1,
    select: { id: true, gamertag: true, displayName: true, isAdmin: true },
  });
  return rows
    .filter((m) => !isPanelOwnerGamertag(m.gamertag, ownerGamertag))
    .slice(0, limit);
}

export type PanelAccountMutation =
  | { ok: true; accountId: string; memberId: string; gamertag: string }
  | { ok: false; error: string };

export async function createPanelAccount(input: {
  userId: string;
  memberId: string;
  createdBy: string;
  ownerGamertag: string;
}): Promise<PanelAccountMutation> {
  const member = await prisma.directoryMember.findFirst({
    where: { id: input.memberId, userId: input.userId },
    select: {
      id: true,
      gamertag: true,
      leftAt: true,
      panelAccount: { select: { id: true } },
    },
  });
  if (!member) return { ok: false, error: "Ese miembro ya no está en el directorio." };
  if (member.leftAt) {
    return { ok: false, error: `${member.gamertag} se salió de la comunidad; no puede tener cuenta.` };
  }
  if (isPanelOwnerGamertag(member.gamertag, input.ownerGamertag)) {
    return { ok: false, error: `${input.ownerGamertag} ya tiene la cuenta permanente.` };
  }
  if (member.panelAccount) {
    return { ok: false, error: `${member.gamertag} ya tiene cuenta.` };
  }

  const clash = await prisma.panelAccount.findFirst({
    where: {
      userId: input.userId,
      member: { gamertag: { equals: gamertagKey(member.gamertag), mode: "insensitive" } },
    },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: `Otra cuenta ya entra como ${member.gamertag}. Corrige el gamertag duplicado en el directorio.`,
    };
  }

  try {
    const account = await prisma.panelAccount.create({
      data: { userId: input.userId, memberId: member.id, createdBy: input.createdBy },
      select: { id: true },
    });
    return { ok: true, accountId: account.id, memberId: member.id, gamertag: member.gamertag };
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === "P2002") {
      return { ok: false, error: `${member.gamertag} ya tiene cuenta.` };
    }
    throw e;
  }
}

export async function deletePanelAccount(input: {
  userId: string;
  accountId: string;
}): Promise<PanelAccountMutation> {
  const account = await prisma.panelAccount.findFirst({
    where: { id: input.accountId, userId: input.userId },
    select: { id: true, member: { select: { id: true, gamertag: true } } },
  });
  if (!account) return { ok: false, error: "Esa cuenta ya no existe." };

  await prisma.panelAccount.deleteMany({ where: { id: account.id } });
  revokePanelAccountSession(account.id);
  return {
    ok: true,
    accountId: account.id,
    memberId: account.member.id,
    gamertag: account.member.gamertag,
  };
}
