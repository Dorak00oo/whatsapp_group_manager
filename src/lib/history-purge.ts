export const PURGE_CONFIRM_WORD = "BORRAR";
export const PURGE_BATCH_SIZE = 2000;
export const PURGE_BATCH_MAX = 5000;

export function parsePurgeLimit(raw: string | null | undefined): number {
  const n = Number(raw ?? PURGE_BATCH_SIZE);
  if (!Number.isFinite(n)) return PURGE_BATCH_SIZE;
  return Math.min(PURGE_BATCH_MAX, Math.max(1, Math.floor(n)));
}

export function matchesPurgeConfirm(value: string): boolean {
  return value.trim().toUpperCase() === PURGE_CONFIRM_WORD;
}

export function formatEventCount(n: number): string {
  return n.toLocaleString("es-CO");
}

export type HistoryPurgeTick = {
  deleted: number;
  remaining: number;
  total: number;
};

export async function runHistoryPurge(opts: {
  url: string;
  total: number;
  onProgress: (tick: HistoryPurgeTick) => void;
}): Promise<HistoryPurgeTick> {
  let remaining = Math.max(0, opts.total);
  let deleted = 0;
  let total = Math.max(0, opts.total);
  opts.onProgress({ deleted, remaining, total });

  while (remaining > 0) {
    const joiner = opts.url.includes("?") ? "&" : "?";
    const res = await fetch(
      `${opts.url}${joiner}limit=${PURGE_BATCH_SIZE}`,
      { method: "DELETE" },
    );
    const data = (await res.json()) as {
      error?: string;
      deleted?: number;
      remaining?: number;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo borrar el historial.");
    }
    const batchDeleted = Math.max(0, data.deleted ?? 0);
    remaining = Math.max(0, data.remaining ?? remaining - batchDeleted);
    deleted += batchDeleted;
    total = Math.max(total, deleted + remaining);
    opts.onProgress({ deleted, remaining, total });
    if (batchDeleted === 0) {
      if (remaining > 0) {
        throw new Error("El servidor no borró filas. Reintentá.");
      }
      break;
    }
  }

  return { deleted, remaining: 0, total };
}
