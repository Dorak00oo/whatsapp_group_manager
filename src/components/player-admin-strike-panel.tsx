"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addDirectoryStrike,
  removeDirectoryStrike,
} from "@/app/dashboard/actions";
import {
  formatStrikeDisplay,
  formatStrikeKindLabel,
  MAX_DIRECTORY_STRIKES,
  memberHasStrikeWithoutReason,
  parseStrikeKind,
  STRIKE_KIND_DEFINITIVE,
  STRIKE_KIND_PENDING,
  type StrikeKind,
} from "@/lib/directory-strikes";
import { softInputNeutral, softPanel } from "@/lib/soft-ui";
import type { StrikeDTO } from "@/types/directory";

export type PlayerAdminMember = {
  id: string;
  gamertag: string;
  displayName: string | null;
  active: boolean;
  leftAt: string | null;
  strikes: StrikeDTO[];
};

type Props = {
  members: PlayerAdminMember[];
};

function kindButtonCls(active: boolean, tone: "pending" | "definitive") {
  const base =
    "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50";
  if (!active) {
    return `${base} border-zinc-300/80 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900`;
  }
  if (tone === "definitive") {
    return `${base} border-red-400/90 bg-red-100 text-red-950 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100`;
  }
  return `${base} border-amber-400/90 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100`;
}

function strikeKindBadgeCls(strikeKind: StrikeKind) {
  return strikeKind === STRIKE_KIND_DEFINITIVE
    ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200"
    : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100";
}

function StrikeSlotsGrid({
  strikes,
  pending,
  onRemove,
}: {
  strikes: StrikeDTO[];
  pending: boolean;
  onRemove: (strikeId: string) => void;
}) {
  return (
    <ol className="mt-3 grid gap-2 sm:grid-cols-3">
      {Array.from({ length: MAX_DIRECTORY_STRIKES }, (_, i) => {
        const strike = strikes[i];
        if (!strike) {
          return (
            <li
              key={`empty-${i}`}
              className="flex min-h-[5.5rem] items-center justify-center rounded-xl border border-dashed border-amber-300/70 bg-white/60 px-3 py-4 text-center text-xs text-zinc-500 dark:border-amber-800/60 dark:bg-zinc-950/40 dark:text-zinc-500"
            >
              Strike {i + 1} — vacío
            </li>
          );
        }
        const strikeKind = parseStrikeKind(strike.kind);
        const label = formatStrikeKindLabel(strikeKind);
        const display = formatStrikeDisplay(strikeKind, strike.reason);
        const hasText = Boolean(strike.reason.trim());
        return (
          <li
            key={strike.id}
            className="relative flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-amber-300/90 bg-white px-3 py-3 dark:border-amber-800/70 dark:bg-zinc-950/60"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Strike {i + 1}
                </p>
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-md text-sm font-bold ${strikeKindBadgeCls(strikeKind)}`}
                  aria-label={
                    strikeKind === STRIKE_KIND_DEFINITIVE
                      ? "Strike definitivo"
                      : "Strike pendiente"
                  }
                >
                  {label}
                </span>
              </div>
              <p
                className={`mt-1 text-sm leading-snug ${
                  hasText
                    ? "text-zinc-800 dark:text-zinc-100"
                    : "font-semibold text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {hasText ? display : label}
              </p>
              <time
                dateTime={strike.createdAt}
                className="mt-2 block text-[10px] text-zinc-500 dark:text-zinc-500"
                suppressHydrationWarning
              >
                {new Date(strike.createdAt).toLocaleString("es")}
              </time>
            </div>
            {onRemove ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(strike.id)}
                className="mt-2 self-start text-xs font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Quitar
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function PlayerAdminStrikePanel({ members }: Props) {
  const roster = useMemo(
    () =>
      [...members]
        .filter((m) => !m.leftAt)
        .sort((a, b) => a.gamertag.localeCompare(b.gamertag, "es")),
    [members],
  );

  const [selectedId, setSelectedId] = useState(roster[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<StrikeKind>(STRIKE_KIND_PENDING);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (m) =>
        m.gamertag.toLowerCase().includes(q) ||
        (m.displayName?.toLowerCase().includes(q) ?? false),
    );
  }, [roster, filter]);

  useEffect(() => {
    if (roster.length === 0) {
      setSelectedId("");
      return;
    }
    if (!roster.some((m) => m.id === selectedId)) {
      setSelectedId(roster[0]!.id);
    }
  }, [roster, selectedId]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((m) => m.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => roster.find((m) => m.id === selectedId) ?? null,
    [roster, selectedId],
  );

  const membersWithStrikes = useMemo(
    () =>
      roster
        .filter((m) => m.strikes.length > 0)
        .sort((a, b) => a.gamertag.localeCompare(b.gamertag, "es")),
    [roster],
  );

  const strikeSlots = selected?.strikes ?? [];
  const canAdd = selected != null && strikeSlots.length < MAX_DIRECTORY_STRIKES;
  const hasStrikeWithoutReason = memberHasStrikeWithoutReason(strikeSlots);

  function onAddStrike(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    const trimmed = reason.trim();
    if (!trimmed && hasStrikeWithoutReason) {
      setError(
        "Solo puede haber un strike sin causa escrita. Añade la descripción o elimina el otro.",
      );
      return;
    }

    const fd = new FormData();
    fd.set("memberId", selected.id);
    fd.set("kind", kind);
    fd.set("reason", trimmed);

    startTransition(async () => {
      const result = await addDirectoryStrike(fd);
      if (result && "error" in result) {
        setError(result.error ?? "No se pudo añadir el strike.");
        return;
      }
      setReason("");
      setError(null);
    });
  }

  function onRemoveStrike(strikeId: string) {
    if (!selected) return;
    startTransition(async () => {
      await removeDirectoryStrike(strikeId, selected.id);
    });
  }

  if (roster.length === 0) {
    return (
      <div className={`${softPanel} border-dashed`}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No hay jugadores en el roster para administrar. Agrega personas desde{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Agregar persona
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={`${softPanel} gap-5`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
          Administración de jugadores
        </p>
        <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Strikes por jugador
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Elige un jugador y el tipo de strike:{" "}
          <span className="font-semibold">?</span> pendiente (aún no definido) o{" "}
          <span className="font-semibold">X</span> definitivo. Puedes registrar
          hasta {MAX_DIRECTORY_STRIKES} por jugador; solo uno puede quedar sin
          causa escrita.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Buscar jugador
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Gamertag o nombre…"
            className={softInputNeutral}
          />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Jugador
          <select
            value={
              filtered.some((m) => m.id === selectedId)
                ? selectedId
                : (filtered[0]?.id ?? "")
            }
            onChange={(e) => {
              setSelectedId(e.target.value);
              setError(null);
              setReason("");
            }}
            disabled={filtered.length === 0}
            className={softInputNeutral}
          >
            {filtered.length === 0 ? (
              <option value="">Sin coincidencias</option>
            ) : (
              filtered.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.gamertag}
                  {m.displayName ? ` — ${m.displayName}` : ""}
                  {!m.active ? " (inactivo)" : ""}
                  {m.strikes.length > 0
                    ? ` · ${m.strikes.length}/${MAX_DIRECTORY_STRIKES} strike${m.strikes.length === 1 ? "" : "s"}`
                    : ""}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {filter.trim() && filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ningún jugador coincide con «{filter.trim()}».
        </p>
      ) : null}

      {selected ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {selected.gamertag}
              {selected.displayName ? (
                <span className="ml-2 font-normal text-zinc-600 dark:text-zinc-400">
                  ({selected.displayName})
                </span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {strikeSlots.length}/{MAX_DIRECTORY_STRIKES} strikes
            </p>
          </div>

          <StrikeSlotsGrid
            strikes={strikeSlots}
            pending={pending}
            onRemove={(strikeId) => onRemoveStrike(strikeId)}
          />

          {canAdd ? (
            <form
              onSubmit={onAddStrike}
              className="mt-4 flex flex-col gap-3"
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Tipo de strike
                </legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setKind(STRIKE_KIND_PENDING)}
                    className={kindButtonCls(
                      kind === STRIKE_KIND_PENDING,
                      "pending",
                    )}
                  >
                    ? Pendiente
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setKind(STRIKE_KIND_DEFINITIVE)}
                    className={kindButtonCls(
                      kind === STRIKE_KIND_DEFINITIVE,
                      "definitive",
                    )}
                  >
                    X Definitivo
                  </button>
                </div>
              </fieldset>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Causa (opcional)
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descripción de la falta"
                    className={softInputNeutral}
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-2xl border border-amber-400/80 bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-200 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950/70"
                >
                  {pending ? "Guardando…" : "Añadir strike"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-xs text-amber-900 dark:text-amber-200">
              Este jugador ya tiene {MAX_DIRECTORY_STRIKES} strikes. Quita uno
              para registrar otro.
            </p>
          )}

          {error ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-amber-200/80 pt-5 dark:border-amber-900/50">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Jugadores con strikes
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {membersWithStrikes.length} jugador
            {membersWithStrikes.length === 1 ? "" : "es"}
          </p>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Resumen de todos los que tienen al menos un strike. Pulsa uno para
          editarlo arriba.
        </p>

        {membersWithStrikes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-amber-300/70 bg-white/40 px-4 py-6 text-center text-sm text-zinc-500 dark:border-amber-800/60 dark:bg-zinc-950/30 dark:text-zinc-400">
            Nadie tiene strikes registrados todavía.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {membersWithStrikes.map((m) => {
              const isActive = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id);
                      setError(null);
                      setReason("");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? "border-amber-400/90 bg-amber-100/80 ring-2 ring-amber-400/40 dark:border-amber-700 dark:bg-amber-950/40 dark:ring-amber-600/30"
                        : "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/35"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {m.gamertag}
                        {m.displayName ? (
                          <span className="ml-2 font-normal text-zinc-600 dark:text-zinc-400">
                            ({m.displayName})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {m.strikes.length}/{MAX_DIRECTORY_STRIKES} strikes
                        {!m.active ? " · inactivo" : ""}
                      </p>
                    </div>
                    <ul className="mt-3 flex flex-col gap-2">
                      {m.strikes.map((s, i) => {
                        const strikeKind = parseStrikeKind(s.kind);
                        const label = formatStrikeKindLabel(strikeKind);
                        const hasText = Boolean(s.reason.trim());
                        return (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2 text-xs dark:border-amber-900/40 dark:bg-zinc-950/50"
                          >
                            <span
                              className={`inline-flex size-5 shrink-0 items-center justify-center rounded font-bold ${strikeKindBadgeCls(strikeKind)}`}
                            >
                              {label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                                Strike {i + 1}
                                {hasText ? `: ${s.reason.trim()}` : ` (${label})`}
                              </p>
                              <time
                                dateTime={s.createdAt}
                                className="text-[10px] text-zinc-500"
                                suppressHydrationWarning
                              >
                                {new Date(s.createdAt).toLocaleString("es")}
                              </time>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
