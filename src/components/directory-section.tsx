"use client";

import { Suspense } from "react";
import Link from "next/link";
import type { DirectoryUrlFilters } from "@/lib/directory-query";
import type { DirectoryMemberDTO } from "@/types/directory";
import { DirectoryFilters } from "@/components/directory-filters";
import { DirectoryMemberCard } from "@/components/directory-member-card";

/** Orden: roster activo → roster inactivo → se salieron (más reciente primero). */
function sortMembersSingleList(members: DirectoryMemberDTO[]): DirectoryMemberDTO[] {
  const tier = (m: DirectoryMemberDTO) => {
    if (m.leftAt) return 2;
    if (m.active) return 0;
    return 1;
  };
  return [...members].sort((a, b) => {
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    if (a.leftAt && b.leftAt) {
      return new Date(b.leftAt).getTime() - new Date(a.leftAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const stripGreen =
  "break-words rounded-xl border-l-4 border-l-green-500 bg-green-100 px-3 py-2 text-sm font-semibold text-zinc-800 shadow-[0_0_18px_-6px_rgba(34,197,94,0.35)] ring-1 ring-green-200/90 dark:border-l-green-700 dark:bg-green-950/70 dark:text-zinc-100 dark:ring-green-900/60 dark:shadow-[0_0_22px_-8px_rgba(22,163,74,0.12)]";
const stripSky =
  "break-words rounded-xl border-l-4 border-l-sky-500 bg-sky-100 px-3 py-2 text-sm font-semibold text-zinc-800 shadow-[0_0_18px_-6px_rgba(14,165,233,0.34)] ring-1 ring-sky-200/90 dark:border-l-sky-700 dark:bg-sky-950/70 dark:text-zinc-100 dark:ring-sky-900/60 dark:shadow-[0_0_22px_-8px_rgba(3,105,161,0.12)]";
const stripViolet =
  "break-words rounded-xl border-l-4 border-l-violet-500 bg-violet-100 px-3 py-2 text-sm font-semibold text-zinc-800 shadow-[0_0_18px_-6px_rgba(139,92,246,0.38)] ring-1 ring-violet-200/90 dark:border-l-violet-700 dark:bg-violet-950/70 dark:text-zinc-100 dark:ring-violet-900/60 dark:shadow-[0_0_22px_-8px_rgba(91,33,182,0.14)]";

export type DirectoryRosterCounts = {
  active: number;
  inactive: number;
  left: number;
};

function RosterCountsStrip({ counts }: { counts: DirectoryRosterCounts }) {
  return (
    <div
      className="mb-4 grid gap-2 sm:grid-cols-3"
      role="region"
      aria-label="Cantidades por situación en roster (cohorte, país, búsqueda y baneos; sin filtro de estado de la lista)"
    >
      <div className={stripGreen}>
        Los que estuvieron activos ({counts.active})
      </div>
      <div className={stripSky}>
        Los inactivos ({counts.inactive})
      </div>
      <div className={stripViolet}>
        Los que se salieron ({counts.left})
      </div>
    </div>
  );
}

function MemberList({
  members,
  empty,
}: {
  members: DirectoryMemberDTO[];
  empty: string;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-[1.75rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 p-6 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
        {empty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {members.map((m) => (
        <DirectoryMemberCard key={m.id} m={m} />
      ))}
    </ul>
  );
}

type Props = {
  filters: DirectoryUrlFilters;
  countryCodes: string[];
  members: DirectoryMemberDTO[];
  rosterCounts: DirectoryRosterCounts;
};

export function DirectorySection({
  filters,
  countryCodes,
  members,
  rosterCounts,
}: Props) {
  const activeRoster = members.filter((m) => !m.leftAt && m.active);
  const inactiveRoster = members.filter((m) => !m.leftAt && !m.active);
  const leftCommunity = members.filter((m) => Boolean(m.leftAt));

  const showSplit =
    filters.view === "split" && filters.status === "all";

  return (
    <>
      <Suspense
        fallback={
          <div className="mb-4 h-24 animate-pulse rounded-[1.75rem] bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800/50 dark:ring-zinc-700/50" />
        }
      >
        <DirectoryFilters filters={filters} countryCodes={countryCodes} />
      </Suspense>

      {!showSplit ? <RosterCountsStrip counts={rosterCounts} /> : null}

      {members.length === 0 ? (
        <p className="rounded-[1.75rem] border border-dashed border-zinc-300/90 bg-zinc-50/80 p-8 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
          No hay personas con estos filtros. Cambia los filtros,{" "}
          <Link
            href="/dashboard/agregar"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            agrega una persona
          </Link>{" "}
          o{" "}
          <Link
            href="/dashboard/importar"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
          >
            importa / pega log
          </Link>
          .
        </p>
      ) : showSplit ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className={`mb-3 ${stripGreen}`}>
              Los que estuvieron activos ({rosterCounts.active})
            </h3>
            <MemberList
              members={activeRoster}
              empty="Nadie activo en roster con estos filtros."
            />
          </div>
          <div>
            <h3 className={`mb-3 ${stripSky}`}>
              Los inactivos ({rosterCounts.inactive})
            </h3>
            <MemberList
              members={inactiveRoster}
              empty="Nadie inactivo en comunidad con estos filtros."
            />
          </div>
          <div>
            <h3 className={`mb-3 ${stripViolet}`}>
              Los que se salieron ({rosterCounts.left})
            </h3>
            <MemberList
              members={leftCommunity}
              empty="Nadie marcado como salido con estos filtros."
            />
          </div>
        </div>
      ) : (
        <MemberList
          members={
            filters.status === "all" && filters.view === "single"
              ? sortMembersSingleList(members)
              : members
          }
          empty="Sin resultados."
        />
      )}
    </>
  );
}
