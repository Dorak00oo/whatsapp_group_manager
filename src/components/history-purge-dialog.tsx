"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PURGE_CONFIRM_WORD,
  formatEventCount,
  matchesPurgeConfirm,
} from "@/lib/history-purge";
import { softInputNeutral } from "@/lib/soft-ui";

type Props = {
  open: boolean;
  title: string;
  description: string;
  eventCount: number;
  onCancel: () => void;
  onConfirmed: () => void;
};

export function HistoryPurgeDialog({
  open,
  title,
  description,
  eventCount,
  onCancel,
  onConfirmed,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const canDelete = matchesPurgeConfirm(typed);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTyped("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  useEffect(() => {
    if (open && step === 2) inputRef.current?.focus();
  }, [open, step]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] dark:bg-black/70"
        aria-label="Cancelar"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:shadow-none dark:ring-zinc-700/60"
      >
        <h2
          id={titleId}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {step === 1
            ? `${title} (1 de 2)`
            : "Escribí BORRAR para confirmar (2 de 2)"}
        </h2>
        <p
          id={descId}
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {step === 1
            ? `${description} Se van a borrar ${formatEventCount(eventCount)} evento${eventCount === 1 ? "" : "s"}. No se puede deshacer.`
            : `Confirmación final. El listado se reemplaza por el progreso de borrado. Palabra: ${PURGE_CONFIRM_WORD}.`}
        </p>

        {step === 2 ? (
          <label htmlFor={inputId} className="mt-4 flex flex-col gap-1 text-xs font-semibold">
            Confirmación
            <input
              ref={inputRef}
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (canDelete) onConfirmed();
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={softInputNeutral}
              placeholder={PURGE_CONFIRM_WORD}
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600/60 dark:hover:bg-zinc-700"
          >
            Cancelar
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={!canDelete}
              onClick={onConfirmed}
              className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Borrar historial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
