"use client";

import { useEffect, useState, type TransitionStartFunction } from "react";
import { setDirectoryMemberSituation } from "@/app/dashboard/actions";
import {
  memberRosterSituation,
  type DirectoryRosterSituation,
} from "@/lib/directory-situation";
import type { DirectoryMemberDTO } from "@/types/directory";

const options: {
  value: DirectoryRosterSituation;
  label: string;
  hint: string;
  selected: string;
  idle: string;
}[] = [
  {
    value: "normal",
    label: "Activo normal",
    hint: "Por defecto. Minecraft puede pasar a inactivo si deja de conectar.",
    selected:
      "border-emerald-400 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-50",
    idle: "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
  },
  {
    value: "permanent",
    label: "Activo permanente",
    hint: "No baja a inactivo aunque Minecraft marque inactividad.",
    selected:
      "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950/55 dark:text-amber-50",
    idle: "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
  },
  {
    value: "absent",
    label: "Ausente con causa",
    hint: "Sigue en comunidad y en allowlist; el sync de Minecraft no lo mueve. Hay que indicar la causa.",
    selected:
      "border-cyan-400 bg-cyan-100 text-cyan-950 dark:border-cyan-600 dark:bg-cyan-950/55 dark:text-cyan-50",
    idle: "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
  },
  {
    value: "inactive",
    label: "Inactivo",
    hint: "Sigue en la lista, sin participar. Puede salir del allowlist.",
    selected:
      "border-slate-400 bg-slate-100 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-50",
    idle: "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
  },
];

type Props = {
  m: DirectoryMemberDTO;
  pending: boolean;
  startTransition: TransitionStartFunction;
};

export function DirectoryMemberSituationPicker({
  m,
  pending,
  startTransition,
}: Props) {
  const current = memberRosterSituation(m);
  const [absentReason, setAbsentReason] = useState(m.absentReason ?? "");
  const [draftingAbsent, setDraftingAbsent] = useState(false);
  const [causeError, setCauseError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- espejo de la ficha
    setAbsentReason(m.absentReason ?? "");
    setDraftingAbsent(false);
    setCauseError(null);
  }, [m.absentReason, m.id]);

  function apply(situation: DirectoryRosterSituation, reason?: string) {
    setCauseError(null);
    startTransition(async () => {
      const r = await setDirectoryMemberSituation(m.id, situation, reason);
      if (r && "error" in r && r.error) {
        setCauseError(r.error);
        return;
      }
      setDraftingAbsent(false);
    });
  }

  function choose(situation: DirectoryRosterSituation) {
    if (situation === "absent") {
      setDraftingAbsent(true);
      setCauseError(null);
      return;
    }
    setDraftingAbsent(false);
    setCauseError(null);
    apply(situation);
  }

  function saveAbsent() {
    const reason = absentReason.trim();
    if (!reason) {
      setCauseError("La causa de la ausencia es obligatoria");
      return;
    }
    apply("absent", reason);
  }

  if (m.leftAt) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Marcado como salida de la comunidad. Usa «Volvió a la comunidad» más
        abajo para elegir de nuevo activo normal, permanente o ausente.
      </p>
    );
  }

  const selectedHint =
    options.find((o) => o.value === current)?.hint ?? options[0]!.hint;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Situación en roster
      </p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const selected =
            o.value === "absent"
              ? current === "absent" || draftingAbsent
              : current === o.value && !draftingAbsent;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending}
              aria-pressed={selected}
              onClick={() => {
                if (selected && o.value !== "absent") return;
                choose(o.value);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                selected ? o.selected : o.idle
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {draftingAbsent || current === "absent"
          ? options.find((o) => o.value === "absent")!.hint
          : selectedHint}
      </p>
      {current === "absent" || draftingAbsent ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              value={absentReason}
              onChange={(e) => {
                setAbsentReason(e.target.value);
                if (causeError) setCauseError(null);
              }}
              required
              aria-required
              placeholder="Causa de la ausencia"
              className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-cyan-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              disabled={pending}
              onClick={saveAbsent}
              className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2.5 text-sm font-medium text-cyan-950 hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100 dark:hover:bg-cyan-950/60"
            >
              {current === "absent" ? "Guardar causa" : "Confirmar ausencia"}
            </button>
          </div>
          {causeError ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {causeError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
