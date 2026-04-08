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

  const accent =
    m.banned
      ? "from-red-500 to-rose-600"
      : m.leftAt
        ? "from-slate-400 to-slate-500"
        : m.active
          ? "from-emerald-500 to-teal-600"
          : "from-zinc-400 to-zinc-500";

  function openEditor() {
    setFormKey((k) => k + 1);
    setEditOpen(true);
  }

  return (
    <li className="list-none">
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white via-white to-zinc-50/90 shadow-sm transition-[box-shadow,transform] duration-200 hover:shadow-md hover:shadow-zinc-200/60 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/90 dark:hover:shadow-black/40 ${
          m.banned
            ? "border-red-200/90 dark:border-red-900/60"
            : m.leftAt
              ? "border-slate-300/80 dark:border-slate-600"
              : m.active
                ? "border-emerald-200/70 dark:border-emerald-900/40"
                : "border-zinc-200/90 opacity-95 dark:border-zinc-700/80"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent}`}
          aria-hidden
        />
        <div className="flex gap-3 p-3 pl-4 sm:gap-4 sm:p-4 sm:pl-5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-inner ${accent}`}
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
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200/90 bg-white p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-emerald-300/80 hover:text-emerald-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                    title="Editar persona"
                    aria-label={`Editar ${m.gamertag}`}
                  >
                    <PencilIcon />
                  </button>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                    {m.strikes.length} strike{m.strikes.length === 1 ? "" : "s"}
                  </span>
                </div>
                {m.displayName ? (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {m.displayName.trim()}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {country ? (
                <span className="text-zinc-500 dark:text-zinc-400">{country}</span>
              ) : null}
              <a
                href={`tel:${m.phone.replace(/\s/g, "")}`}
                className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {m.phone}
              </a>
              <time
                className="text-xs text-zinc-400 dark:text-zinc-500"
                dateTime={m.createdAt}
                suppressHydrationWarning
              >
                {new Date(m.createdAt).toLocaleString("es")}
              </time>
            </div>

            <DirectoryMemberRoleChips m={m} compact />

            {m.banned && m.bannedReason ? (
              <p className="mt-2 line-clamp-2 text-xs text-red-600 dark:text-red-400">
                <span className="font-medium">Ban:</span> {m.bannedReason}
              </p>
            ) : null}

            {m.leftAt && !m.banned ? (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Salida{" "}
                <time dateTime={m.leftAt} suppressHydrationWarning>
                  {new Date(m.leftAt).toLocaleDateString("es")}
                </time>
              </p>
            ) : null}

            {m.notes ? (
              <p
                className="mt-2 line-clamp-2 border-l-2 border-zinc-200 pl-2 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
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
