"use client";

import { useState } from "react";
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

  const neonGreen =
    "border-l-4 border-l-green-500 shadow-[0_0_22px_-8px_rgba(34,197,94,0.38)] dark:border-l-green-700 dark:shadow-[0_0_26px_-10px_rgba(22,163,74,0.12)]";
  const neonSky =
    "border-l-4 border-l-sky-500 shadow-[0_0_22px_-8px_rgba(14,165,233,0.36)] dark:border-l-sky-700 dark:shadow-[0_0_26px_-10px_rgba(3,105,161,0.12)]";
  const neonViolet =
    "border-l-4 border-l-violet-500 shadow-[0_0_24px_-8px_rgba(139,92,246,0.42)] dark:border-l-violet-700 dark:shadow-[0_0_26px_-10px_rgba(91,33,182,0.14)]";

  const surface = m.banned
    ? "bg-rose-100 ring-rose-200/90 dark:bg-rose-950/45 dark:ring-rose-900/50"
    : m.leftAt
      ? `bg-violet-100 ring-violet-200/90 dark:bg-violet-950/70 dark:ring-violet-900/60 ${neonViolet}`
      : m.active
        ? `bg-green-100 ring-green-200/90 dark:bg-green-950/70 dark:ring-green-900/60 ${neonGreen}`
        : `bg-sky-100 ring-sky-200/90 dark:bg-sky-950/70 dark:ring-sky-900/60 ${neonSky}`;

  function openEditor() {
    setFormKey((k) => k + 1);
    setEditOpen(true);
  }

  return (
    <li className="list-none">
      <div
        className={`group relative overflow-hidden rounded-[1.75rem] p-4 pl-5 shadow-sm shadow-zinc-900/[0.04] ring-1 ring-zinc-200/60 transition-[box-shadow,transform] duration-200 hover:scale-[1.005] hover:shadow-md dark:shadow-none dark:ring-zinc-800/65 ${surface}`}
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
              <p className="mt-2 line-clamp-2 text-xs text-red-700 dark:text-red-400">
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

            {m.notes ? (
              <p
                className="mt-2 line-clamp-2 border-l-2 border-zinc-300/80 pl-2 text-xs text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                title={m.notes}
              >
                {m.notes}
              </p>
            ) : null}
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
