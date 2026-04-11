"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { softInputNeutral } from "@/lib/soft-ui";

export type SoftListboxAccent =
  | "neutral"
  | "emerald"
  | "slate"
  | "amber"
  | "red"
  | "lime"
  | "fuchsia"
  | "cyan";

export type SoftListboxItem =
  | { kind: "heading"; label: string }
  | {
      kind: "option";
      value: string;
      label: string;
      accent?: SoftListboxAccent;
    };

function optionSurface(
  accent: SoftListboxAccent | undefined,
  selected: boolean,
): string {
  const a = accent ?? "neutral";
  const sel = selected ? "selected" : "idle";
  const map: Record<
    SoftListboxAccent,
    { idle: string; selected: string }
  > = {
    neutral: {
      idle:
        "border-zinc-200/90 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/75",
      selected:
        "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-50",
    },
    emerald: {
      idle:
        "border-emerald-200/80 border-l-[5px] border-l-emerald-800 bg-emerald-50/90 text-zinc-900 hover:bg-emerald-100 dark:border-emerald-900/50 dark:border-l-emerald-600 dark:bg-emerald-950/40 dark:text-zinc-100 dark:hover:bg-emerald-950/60",
      selected:
        "border-emerald-300 border-l-[5px] border-l-emerald-900 bg-emerald-100 text-zinc-900 dark:border-emerald-800 dark:border-l-emerald-500 dark:bg-emerald-950/70 dark:text-zinc-50",
    },
    slate: {
      idle:
        "border-slate-200/90 border-l-[5px] border-l-slate-700 bg-slate-50 text-zinc-900 hover:bg-slate-100 dark:border-slate-700 dark:border-l-slate-400 dark:bg-slate-900/45 dark:text-zinc-100 dark:hover:bg-slate-800/80",
      selected:
        "border-slate-300 border-l-[5px] border-l-slate-800 bg-slate-100 text-zinc-900 dark:border-slate-600 dark:border-l-slate-300 dark:bg-slate-800 dark:text-zinc-50",
    },
    amber: {
      idle:
        "border-amber-200/80 border-l-[5px] border-l-amber-800 bg-amber-50 text-zinc-900 hover:bg-amber-100 dark:border-amber-900/45 dark:border-l-amber-500 dark:bg-amber-950/35 dark:text-zinc-100 dark:hover:bg-amber-950/55",
      selected:
        "border-amber-300 border-l-[5px] border-l-amber-900 bg-amber-100 text-zinc-900 dark:border-amber-800 dark:border-l-amber-400 dark:bg-amber-950/55 dark:text-zinc-50",
    },
    red: {
      idle:
        "border-red-200/80 border-l-[5px] border-l-red-800 bg-red-50 text-zinc-900 hover:bg-red-100 dark:border-red-900/50 dark:border-l-red-600 dark:bg-red-950/40 dark:text-zinc-100 dark:hover:bg-red-950/60",
      selected:
        "border-red-300 border-l-[5px] border-l-red-900 bg-red-100 text-zinc-900 dark:border-red-800 dark:border-l-red-500 dark:bg-red-950/65 dark:text-zinc-50",
    },
    lime: {
      idle:
        "border-lime-200/80 border-l-[5px] border-l-lime-700 bg-lime-50 text-zinc-900 hover:bg-lime-100 dark:border-lime-900/40 dark:border-l-lime-500 dark:bg-lime-950/30 dark:text-lime-100 dark:hover:bg-lime-950/50",
      selected:
        "border-lime-300 border-l-[5px] border-l-lime-800 bg-lime-100 text-zinc-900 dark:border-lime-800 dark:border-l-lime-400 dark:bg-lime-950/55 dark:text-lime-50",
    },
    fuchsia: {
      idle:
        "border-fuchsia-200/80 border-l-[5px] border-l-fuchsia-800 bg-fuchsia-50 text-zinc-900 hover:bg-fuchsia-100 dark:border-fuchsia-900/45 dark:border-l-fuchsia-500 dark:bg-fuchsia-950/35 dark:text-fuchsia-100 dark:hover:bg-fuchsia-950/55",
      selected:
        "border-fuchsia-300 border-l-[5px] border-l-fuchsia-900 bg-fuchsia-100 text-zinc-900 dark:border-fuchsia-800 dark:border-l-fuchsia-400 dark:bg-fuchsia-950/60 dark:text-fuchsia-50",
    },
    cyan: {
      idle:
        "border-cyan-200/80 border-l-[5px] border-l-cyan-700 bg-cyan-50 text-zinc-900 hover:bg-cyan-100 dark:border-cyan-900/45 dark:border-l-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-100 dark:hover:bg-cyan-950/50",
      selected:
        "border-cyan-300 border-l-[5px] border-l-cyan-800 bg-cyan-100 text-zinc-900 dark:border-cyan-800 dark:border-l-cyan-400 dark:bg-cyan-950/55 dark:text-cyan-50",
    },
  };
  return `border border-solid ${map[a][sel]}`;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  items: SoftListboxItem[];
  disabled?: boolean;
  className?: string;
  title?: string;
  /** Etiqueta visible sobre el control (se asocia por `aria-labelledby`) */
  labelId: string;
};

export function SoftListbox({
  value,
  onChange,
  items,
  disabled,
  className,
  title,
  labelId,
}: Props) {
  const uid = useId();
  const triggerId = `${uid}-trigger`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () => items.filter((i): i is Extract<SoftListboxItem, { kind: "option" }> => i.kind === "option"),
    [items],
  );

  const currentLabel = useMemo(() => {
    const hit = options.find((o) => o.value === value);
    return hit?.label ?? value;
  }, [options, value]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const pick = (v: string) => {
    onChange(v);
    close();
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ""}`}>
      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-55 ${softInputNeutral}`}
      >
        <span className="min-w-0 truncate">{currentLabel}</span>
        <Chevron open={open} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(22rem,70vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-solid border-zinc-200/90 bg-white p-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-950"
        >
          {items.map((item, idx) => {
            if (item.kind === "heading") {
              return (
                <li
                  key={`h-${idx}-${item.label}`}
                  role="presentation"
                  className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 first:pt-1 dark:text-zinc-400"
                >
                  {item.label}
                </li>
              );
            }
            const selected = item.value === value;
            return (
              <li key={item.value} role="none" className="list-none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${optionSurface(item.accent, selected)} mb-0.5 w-full rounded-xl px-3 py-2 text-left text-sm font-medium last:mb-0`}
                  onClick={() => pick(item.value)}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
