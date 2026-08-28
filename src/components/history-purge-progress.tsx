"use client";

import { formatEventCount } from "@/lib/history-purge";

type Props = {
  deleted: number;
  remaining: number;
  total: number;
  error: string | null;
  onRetry: () => void;
};

export function HistoryPurgeProgress({
  deleted,
  remaining,
  total,
  error,
  onRetry,
}: Props) {
  const safeTotal = Math.max(total, deleted + remaining, 1);
  const pct = Math.min(100, Math.round((deleted / safeTotal) * 100));

  return (
    <div className="flex min-h-52 flex-col justify-center gap-4 rounded-xl border border-red-200/80 bg-red-50/40 px-5 py-8 dark:border-red-900/50 dark:bg-red-950/20">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Borrando historial
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {formatEventCount(deleted)} de {formatEventCount(total)} · quedan{" "}
          {formatEventCount(remaining)}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progreso de borrado"
        className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-red-600 transition-[width] duration-200 ease-out dark:bg-red-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {error ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-800 dark:text-red-200" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">No cierres esta pestaña.</p>
      )}
    </div>
  );
}
