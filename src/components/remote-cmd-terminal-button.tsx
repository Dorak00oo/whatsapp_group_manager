"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "running" | "done" | "error";

/** Milisegundos entre cada línea revelada; misma sensación de ejecución en vivo que la auditoría. */
const LINE_REVEAL_MS = 70;

type SkippedCorrection = { oldGamertag: string; newGamertag: string; reason: string };

type RemoteCmdResponse = {
  error?: string;
  targetGamertagsAdd?: string[] | null;
  targetGamertagsRemove?: string[] | null;
  skippedCorrections?: SkippedCorrection[];
};

function buildLines(
  action: string,
  addList: string[],
  removeList: string[],
  skipped: SkippedCorrection[],
): string[] {
  const lines: string[] = [`$ web → addon: ${action}`];
  if (addList.length === 0 && removeList.length === 0) {
    lines.push("(sin cambios pendientes)");
  } else {
    for (const name of addList) lines.push(`allowlist add "${name}"`);
    for (const name of removeList) lines.push(`allowlist remove "${name}"`);
    lines.push(`OK: +${addList.length} añadido${addList.length === 1 ? "" : "s"} / -${removeList.length} quitado${removeList.length === 1 ? "" : "s"}`);
  }
  for (const s of skipped) {
    lines.push(`⚠ omitido "${s.oldGamertag}" → "${s.newGamertag}": ${s.reason}`);
  }
  return lines;
}

type Props = {
  action: "allowlist_sync" | "allowlist_sync_corrected";
  idleLabel: string;
  loadingLabel: string;
  doneLabel: string;
  buttonClassName: string;
  title: string;
};

export function RemoteCmdTerminalButton({
  action,
  idleLabel,
  loadingLabel,
  doneLabel,
  buttonClassName,
  title,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [allLines, setAllLines] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
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

  async function run() {
    setError(null);
    setAllLines([]);
    setVisibleCount(0);
    setPhase("running");
    try {
      const res = await fetch("/api/minecraft/remote-cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as RemoteCmdResponse;
      if (!res.ok) {
        setError(data.error ?? "No se pudo encolar el comando");
        setPhase("error");
        return;
      }
      setAllLines(
        buildLines(
          action,
          data.targetGamertagsAdd ?? [],
          data.targetGamertagsRemove ?? [],
          data.skippedCorrections ?? [],
        ),
      );
      if ((data.targetGamertagsAdd?.length ?? 0) === 0 && (data.targetGamertagsRemove?.length ?? 0) === 0) {
        setPhase("done");
      }
    } catch {
      setError("Error de red al enviar el comando.");
      setPhase("error");
    }
  }

  const running = phase === "running";
  const isTyping = running && visibleCount < allLines.length;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className={`${buttonClassName} self-start`}
        title={title}
      >
        {running ? loadingLabel : phase === "done" ? doneLabel : idleLabel}
      </button>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "running" || phase === "done" ? (
        <div
          ref={terminalRef}
          className="max-h-48 w-full max-w-sm overflow-y-auto rounded-2xl bg-zinc-950 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-emerald-300 shadow-inner"
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
    </div>
  );
}
