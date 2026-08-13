"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncDirectoryFromMinecraftPanel } from "@/app/dashboard/actions";

type SyncLists = {
  activated: string[];
  deactivated: string[];
  matchedGamertags: number;
  minecraftCount: number;
};

function NameList({
  title,
  names,
  tone,
}: {
  title: string;
  names: string[];
  tone: "active" | "inactive";
}) {
  if (names.length === 0) return null;
  const chip =
    tone === "active"
      ? "bg-emerald-50 text-emerald-950 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/50"
      : "bg-zinc-100 text-zinc-800 ring-zinc-200/80 dark:bg-zinc-900/70 dark:text-zinc-200 dark:ring-zinc-700/60";
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        {title} ({names.length})
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {names.map((name) => (
          <li
            key={name}
            className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 ${chip}`}
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DirectoryMinecraftSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<SyncLists | null>(null);

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Alinear esta lista con{" "}
          <Link
            href="/dashboard/minecraft"
            className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Minecraft
          </Link>{" "}
          (mismo gamertag: activo/inactivo y blacklist; no cambia a quienes se
          salieron del grupo ni a los de activo permanente).
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setLists(null);
            startTransition(async () => {
              const r = await syncDirectoryFromMinecraftPanel();
              if ("error" in r) {
                setError(r.error);
                return;
              }
              setLists({
                activated: r.activated,
                deactivated: r.deactivated,
                matchedGamertags: r.matchedGamertags,
                minecraftCount: r.minecraftCount,
              });
              router.refresh();
            });
          }}
          className="shrink-0 self-start rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {pending ? "Actualizando…" : "Actualizar desde Minecraft"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {lists ? (
        <div
          className="flex flex-col gap-3 rounded-2xl bg-zinc-50/90 px-3 py-3 ring-1 ring-zinc-200/80 dark:bg-zinc-900/40 dark:ring-zinc-800/80"
          role="status"
        >
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {lists.matchedGamertags} coinciden con un activo de MC · Activos en
            MC: {lists.minecraftCount}
            {lists.activated.length === 0 && lists.deactivated.length === 0
              ? " · Nadie cambió de estado."
              : null}
          </p>
          <NameList
            title="Volvieron a activo"
            names={lists.activated}
            tone="active"
          />
          <NameList
            title="Pasaron a inactivo"
            names={lists.deactivated}
            tone="inactive"
          />
        </div>
      ) : null}
    </div>
  );
}
