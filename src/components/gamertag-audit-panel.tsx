"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  approveGamertagAuditSuggestion,
  rejectGamertagAuditSuggestion,
  runGamertagAudit,
} from "@/app/dashboard/gamertag-audit-actions";
import type { PendingGamertagAuditSuggestion } from "@/lib/gamertag-audit";
import { softBtnMint, softBtnPrimary, softPanel } from "@/lib/soft-ui";

type Phase = "idle" | "running" | "done";

/** Milisegundos entre cada línea revelada en la terminal; da la sensación de ejecución en vivo. */
const LINE_REVEAL_MS = 90;

function splitSuffix(raw: string): { base: string; suffix: string } {
  const match = /^(.*?)(\d*)$/.exec(raw);
  const suffix = match?.[2] ?? "";
  const base = suffix ? raw.slice(0, raw.length - suffix.length) : raw;
  return { base, suffix };
}

/** Describe en qué se diferencian dos gamertags que "son la misma persona" (mayúsculas y/o sufijo numérico). */
function describeGamertagDiff(current: string, suggested: string): string {
  const a = splitSuffix(current);
  const b = splitSuffix(suggested);
  const caseDiffers = a.base !== b.base;
  const suffixDiffers = a.suffix !== b.suffix;

  if (caseDiffers && suffixDiffers) {
    return "Mismas letras que el gamertag del grupo, pero en Minecraft las mayúsculas y los números finales son distintos.";
  }
  if (caseDiffers) {
    return "Mismo gamertag que el grupo, pero en Minecraft las mayúsculas son distintas (Minecraft sí distingue mayúsculas).";
  }
  return "Mismas letras que el gamertag del grupo, pero en Minecraft tiene números al final que faltan o son distintos.";
}

function SuggestionRow({
  suggestion,
  onResolved,
}: {
  suggestion: PendingGamertagAuditSuggestion;
  onResolved: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "approve" | "reject") {
    setError(null);
    setAction(kind);
    setPending(true);
    const fn =
      kind === "approve"
        ? approveGamertagAuditSuggestion
        : rejectGamertagAuditSuggestion;
    const r = await fn(suggestion.id);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    onResolved(suggestion.id);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-amber-50/90 px-3 py-2.5 ring-1 ring-amber-200/80 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/25 dark:ring-amber-900/50">
      <div className="min-w-0 text-xs">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {suggestion.displayName ? `${suggestion.displayName} · ` : ""}
          <span className="line-through opacity-70">
            {suggestion.currentGamertag}
          </span>{" "}
          <span aria-hidden>→</span>{" "}
          <span className="font-semibold">{suggestion.suggestedGamertag}</span>
        </p>
        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
          {describeGamertagDiff(
            suggestion.currentGamertag,
            suggestion.suggestedGamertag,
          )}
        </p>
        {error ? (
          <p className="mt-1 text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("approve")}
          className={`${softBtnMint} px-3 py-1.5 text-xs`}
        >
          {pending && action === "approve" ? "Aplicando…" : "Corregir en WhatsApp"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("reject")}
          className="rounded-2xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-200 disabled:opacity-60 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {pending && action === "reject" ? "Descartando…" : "No es el mismo"}
        </button>
      </div>
    </li>
  );
}

export function GamertagAuditPanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [allLines, setAllLines] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [suggestions, setSuggestions] = useState<
    PendingGamertagAuditSuggestion[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phase !== "running") return;
    if (visibleCount >= allLines.length) {
      if (allLines.length > 0) setPhase("done");
      return;
    }
    const t = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, LINE_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, visibleCount, allLines.length]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [visibleCount]);

  async function start() {
    setError(null);
    setSuggestions([]);
    setAllLines([]);
    setVisibleCount(0);
    setPhase("running");

    const r = await runGamertagAudit();
    if ("error" in r) {
      setError(r.error);
      setPhase("idle");
      return;
    }
    setAllLines(r.lines);
    setSuggestions(r.suggestions);
    // El efecto de arriba se encarga de revelar línea por línea.
  }

  function handleResolved(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  const running = phase === "running";
  const isTyping = running && visibleCount < allLines.length;

  return (
    <div className={`${softPanel} gap-4`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Auditoría de gamertags
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Posibles errores de escritura
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Compara cada jugador visto en Minecraft (sin coincidencia exacta,
          mayúsculas incluidas) contra los gamertags activos del grupo de
          WhatsApp. Solo detecta casos muy concretos: mismas letras y espacios
          (ignorando mayúsculas) pero con mayúsculas distintas, números al
          final que faltan o son distintos, o ambas cosas a la vez. Minecraft
          sí distingue mayúsculas, así que esa diferencia también hace falta
          corregirla para que el allowlist del servidor funcione. No corrige
          errores de tipeo en las letras, para no confundir a dos jugadores
          distintos con nombres parecidos. Nada se corrige solo: hace falta
          aprobar el cambio manualmente.
        </p>
      </div>

      <button
        type="button"
        disabled={running}
        onClick={start}
        className={`${softBtnPrimary} self-start`}
      >
        {running
          ? "Comparando…"
          : phase === "done"
            ? "Volver a comparar"
            : "Iniciar comparación"}
      </button>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {phase !== "idle" ? (
        <div
          ref={terminalRef}
          className="max-h-64 overflow-y-auto rounded-2xl bg-zinc-950 px-4 py-3 font-mono text-[11px] leading-relaxed text-emerald-300 shadow-inner"
          role="log"
          aria-live="polite"
        >
          {allLines.slice(0, visibleCount).map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
          {isTyping ? (
            <span className="inline-block h-3 w-1.5 animate-pulse bg-emerald-300 align-middle" />
          ) : null}
        </div>
      ) : null}

      {phase === "done" ? (
        suggestions.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Por ahora ningún jugador de Minecraft coincide en letras con uno
            de WhatsApp que tenga mayúsculas o números al final distintos, así
            que no hay nada que revisar.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Resultado: {suggestions.length} sugerencia
              {suggestions.length === 1 ? "" : "s"} para revisar
            </p>
            <ul className="flex flex-col gap-2">
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  onResolved={handleResolved}
                />
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
