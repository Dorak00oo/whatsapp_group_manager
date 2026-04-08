"use client";

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

function MemberList({
  members,
  empty,
}: {
  members: DirectoryMemberDTO[];
  empty: string;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
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
};

export function DirectorySection({ filters, countryCodes, members }: Props) {
  const activeRoster = members.filter((m) => !m.leftAt && m.active);
  const inactiveRoster = members.filter((m) => !m.leftAt && !m.active);
  const leftCommunity = members.filter((m) => Boolean(m.leftAt));

  const showSplit =
    filters.view === "split" && filters.status === "all";

  return (
    <>
      <DirectoryFilters filters={filters} countryCodes={countryCodes} />

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No hay personas con estos filtros. Cambia los filtros o{" "}
          <Link
            href="/dashboard/agregar"
            className="font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            agrega una persona
          </Link>
          .
        </p>
      ) : showSplit ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Los que estuvieron activos ({activeRoster.length})
            </h3>
            <MemberList
              members={activeRoster}
              empty="Nadie activo en roster con estos filtros."
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Los inactivos ({inactiveRoster.length})
            </h3>
            <MemberList
              members={inactiveRoster}
              empty="Nadie inactivo en comunidad con estos filtros."
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Los que se salieron ({leftCommunity.length})
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
