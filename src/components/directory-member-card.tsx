"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DirectoryMemberEditorDialog } from "@/components/directory-member-editor-dialog";
import { DirectoryMemberRoleChips } from "@/components/directory-member-role-chips";
import type { DirectoryMemberDTO } from "@/types/directory";

function regionLabel(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function MemberNotesBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);

  const measure = useCallback(() => {
    const el = pRef.current;
    if (!el) return;
    if (expanded) {
      setCanToggle(true);
      return;
    }
    setCanToggle(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useEffect(() => {
    const el = pRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      className="mt-2 border-l-2 border-zinc-300/80 pl-2 dark:border-zinc-600"
      title={expanded ? undefined : text}
    >
      <p
        ref={pRef}
        className={`text-xs text-zinc-600 dark:text-zinc-400 ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-zinc-700 underline decoration-zinc-400/80 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function DirectoryMemberCard({ m }: { m: DirectoryMemberDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const country = regionLabel(m.phoneCountry);
  const initial = (m.gamertag.trim().charAt(0) || "?").toUpperCase();

  const neonEmerald =
    "border-l-[5px] border-l-emerald-800 border-solid dark:border-l-emerald-600";
  const neonAsh =
    "border-l-[5px] border-l-slate-700 border-solid dark:border-l-slate-400";
  const neonAmber =
    "border-l-[5px] border-l-amber-700 border-solid dark:border-l-amber-500";
  const neonRed =
    "border-l-[5px] border-l-red-800 border-solid dark:border-l-red-600";

  const surface = m.banned
    ? `bg-red-100 dark:bg-red-950/65 ${neonRed}`
    : m.leftAt
      ? `bg-amber-50 dark:bg-amber-950/40 ${neonAmber}`
      : m.active
        ? `bg-emerald-100 dark:bg-emerald-950/55 ${neonEmerald}`
        : `bg-slate-100 dark:bg-slate-900/55 ${neonAsh}`;

  function openEditor() {
    setFormKey((k) => k + 1);
    setEditOpen(true);
  }

  return (
    <li className="list-none">
      <div
        className={`group relative overflow-hidden rounded-[1.75rem] border border-solid border-zinc-200/80 p-4 pl-5 shadow-sm shadow-zinc-900/[0.04] transition-[box-shadow,transform] duration-200 hover:shadow-md md:hover:scale-[1.005] dark:border-zinc-700/80 dark:shadow-none ${surface}`}
      >
        <div className="flex gap-3 sm:gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-base font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
            aria-hidden
          >
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {m.gamertag}
                  </span>
                  <button
                    type="button"
                    onClick={openEditor}
                    className="inline-flex items-center justify-center rounded-xl bg-white/90 p-1.5 text-zinc-700 ring-1 ring-zinc-200/90 transition-colors hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-zinc-600/60"
                    title="Editar persona"
                    aria-label={`Editar ${m.gamertag}`}
                  >
                    <PencilIcon />
                  </button>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-900 ring-1 ring-amber-300/80 dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-700/50">
                    {m.strikes.length} strike{m.strikes.length === 1 ? "" : "s"}
                  </span>
                </div>
                {m.displayName ? (
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {m.displayName.trim()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {country ? (
                <span className="text-zinc-600 dark:text-zinc-400">{country}</span>
              ) : null}
              <a
                href={`tel:${m.phone.replace(/\s/g, "")}`}
                className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
              >
                {m.phone}
              </a>
              <time
                className="text-xs text-zinc-500 dark:text-zinc-500"
                dateTime={m.createdAt}
                suppressHydrationWarning
              >
                {new Date(m.createdAt).toLocaleString("es")}
              </time>
            </div>

            <DirectoryMemberRoleChips m={m} compact />

            {m.banned && m.bannedReason ? (
              <p className="mt-2 line-clamp-2 text-xs font-medium text-red-800 dark:text-red-300">
                <span className="font-medium">Ban:</span> {m.bannedReason}
              </p>
            ) : null}

            {m.leftAt && !m.banned ? (
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                Salida{" "}
                <time dateTime={m.leftAt} suppressHydrationWarning>
                  {new Date(m.leftAt).toLocaleDateString("es")}
                </time>
              </p>
            ) : null}

            {m.notes ? <MemberNotesBlock key={m.notes} text={m.notes} /> : null}
          </div>
        </div>
      </div>

      <DirectoryMemberEditorDialog
        key={formKey}
        m={m}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </li>
  );
}
