"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  blacklistReconcileCandidates,
  type ActiveCompareData,
  type ActiveCompareEntry,
} from "@/lib/directory-minecraft-compare";
import { softBtnLavender, softBtnPeach, softPanel } from "@/lib/soft-ui";

type Props = {
  data: ActiveCompareData;
  snapshotAt: string | null;
};

function CompareColumn({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: { id: string; gamertag: string; label: string; detail?: string | null }[];
  emptyText: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <ol
        className="max-h-[min(28rem,55vh)] min-h-[12rem] flex-1 list-decimal overflow-y-auto rounded-2xl bg-zinc-50/80 px-3 py-2 pl-8 text-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900/50 dark:ring-zinc-800/80"
        aria-label={title}
      >
        {rows.length === 0 ? (
          <li className="list-none py-2 text-zinc-500 dark:text-zinc-400">
            {emptyText}
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="border-b border-zinc-200/60 py-1.5 last:border-0 dark:border-zinc-800/60"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.label}
              </span>
              {row.detail ? (
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {row.detail}
                </span>
              ) : null}
            </li>
          ))
        )}
      </ol>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {rows.length} en total
      </p>
    </div>
  );
}

function ReconcileBlacklistDialog({
  open,
  candidates,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  candidates: ActiveCompareEntry[];
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (gamertags: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSelected(new Set(candidates.map((c) => c.gamertag)));
    }
    wasOpen.current = open;
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, candidates]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const selectedCount = selected.size;
  const allSelected =
    candidates.length > 0 && selectedCount === candidates.length;

  function toggle(gamertag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gamertag)) next.delete(gamertag);
      else next.add(gamertag);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] dark:bg-black/70"
        aria-label="Cerrar"
        disabled={submitting}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="reconcile-blacklist-title"
        className="relative z-10 flex max-h-[min(36rem,90vh)] w-full max-w-lg flex-col rounded-[1.75rem] bg-white p-5 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:shadow-none dark:ring-zinc-700/60"
      >
        <h2
          id="reconcile-blacklist-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Enviar a blacklist
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Activos en Minecraft que no están en el directorio o ya salieron del
          grupo. Marca a quién quieres añadir; los desmarcados no se tocan.
          Al aceptar se envía la blacklist actualizada al servidor.
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            disabled={submitting || allSelected}
            onClick={() =>
              setSelected(new Set(candidates.map((c) => c.gamertag)))
            }
            className="font-medium text-sky-700 underline-offset-2 hover:underline disabled:opacity-40 dark:text-sky-400"
          >
            Marcar todos
          </button>
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => setSelected(new Set())}
            className="font-medium text-sky-700 underline-offset-2 hover:underline disabled:opacity-40 dark:text-sky-400"
          >
            Ninguno
          </button>
        </div>

        <ul className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-zinc-50/90 p-2 ring-1 ring-zinc-200/80 dark:bg-zinc-950/50 dark:ring-zinc-800/80">
          {candidates.map((row) => {
            const checked = selected.has(row.gamertag);
            const inputId = `reconcile-bl-${row.id}`;
            return (
              <li key={row.id}>
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/80 dark:hover:bg-zinc-900/80"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    disabled={submitting}
                    onChange={() => toggle(row.gamertag)}
                    className="mt-1 size-4 shrink-0 accent-zinc-800 dark:accent-zinc-200"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {row.gamertag}
                    </span>
                    {row.detail ? (
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {row.detail}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200/80 hover:bg-zinc-200/80 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600/60 dark:hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => onConfirm([...selected])}
            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {submitting
              ? "Enviando…"
              : `Añadir a blacklist (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DirectoryMinecraftActiveCompare({ data, snapshotAt }: Props) {
  const router = useRouter();
  const { whatsapp, minecraft, summary } = data;
  const suspects = summary.mcActiveNotInWhatsappActive;
  const candidates = useMemo(
    () => blacklistReconcileCandidates(suspects),
    [suspects],
  );

  const [compared, setCompared] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startGamertagCompare() {
    setMessage(null);
    setCompared(true);
    startTransition(() => {
      router.refresh();
    });
  }

  async function confirmBlacklist(gamertags: string[]) {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/reconcile-blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gamertags }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        error?: string;
        blacklisted?: string[];
        already?: string[];
      };
      if (!res.ok || !payload.ok) {
        setMessage(payload.error ?? "No se pudo conciliar la blacklist.");
        return;
      }
      const n = payload.blacklisted?.length ?? 0;
      const already = payload.already?.length ?? 0;
      setDialogOpen(false);
      setMessage(
        n > 0
          ? `${n} jugador${n === 1 ? "" : "es"} a blacklist. Sync all enviado; el addon lo aplicará en ~30 s.`
          : already > 0
            ? "Ya estaban en blacklist. Sync all enviado al servidor."
            : "Nada que actualizar.",
      );
      router.refresh();
    } catch {
      setMessage("Error de red al conciliar la blacklist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${softPanel} gap-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
            Reconciliación
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Comparar activos (orden alfabético)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Lista del grupo de WhatsApp frente a jugadores activos en Minecraft.
            Útil para detectar quién entra al servidor sin estar activo en el
            grupo. Coincidencia por gamertag (sin distinguir mayúsculas).
            {snapshotAt ? (
              <> Datos MC del último reporte: {snapshotAt}.</>
            ) : (
              " Sin snapshot reciente: MC usa solo la tabla local."
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={startGamertagCompare}
            className={softBtnLavender}
          >
            {isPending ? "Comparando…" : "Conciliar gamertags"}
          </button>
          <button
            type="button"
            disabled={candidates.length === 0}
            onClick={() => {
              setMessage(null);
              setDialogOpen(true);
            }}
            className={softBtnPeach}
            title={
              candidates.length === 0
                ? "No hay activos en MC fuera del directorio o del grupo"
                : undefined
            }
          >
            Conciliar blacklist
          </button>
        </div>
      </div>

      {message ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}

      {!compared ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Pulsa <span className="font-medium">Conciliar gamertags</span> para
          comparar las listas (orden alfabético).
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
              WA activos: {summary.whatsappCount}
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
              MC activos: {summary.minecraftCount}
            </span>
            {suspects.length > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                Revisar en MC sin WA activo: {suspects.length}
              </span>
            ) : null}
            {candidates.length > 0 ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-900 dark:bg-red-950/60 dark:text-red-100">
                Candidatos a blacklist: {candidates.length}
              </span>
            ) : null}
          </div>

          {suspects.length > 0 ? (
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                Activos en Minecraft que no coinciden con un activo del grupo
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {suspects.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg bg-white/80 px-2 py-1 text-xs text-amber-950 ring-1 ring-amber-200/80 dark:bg-zinc-900/80 dark:text-amber-50 dark:ring-amber-800/60"
                    title={row.detail ?? undefined}
                  >
                    <span className="font-medium">{row.gamertag}</span>
                    {row.detail ? (
                      <span className="text-amber-800/80 dark:text-amber-200/80">
                        {" "}
                        — {row.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <CompareColumn
              title="WhatsApp (activos)"
              subtitle="En el directorio, sin salida y marcados activos"
              rows={whatsapp}
              emptyText="No hay miembros activos en el directorio."
            />
            <CompareColumn
              title="Minecraft (activos)"
              subtitle="Activos según último reporte (no en lista negra)"
              rows={minecraft}
              emptyText="No hay jugadores activos en Minecraft."
            />
          </div>
        </>
      )}

      <ReconcileBlacklistDialog
        open={dialogOpen}
        candidates={candidates}
        submitting={submitting}
        onCancel={() => {
          if (!submitting) setDialogOpen(false);
        }}
        onConfirm={(gamertags) => void confirmBlacklist(gamertags)}
      />
    </div>
  );
}
