import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import {
  DirectorySection,
  type DirectoryPageSlice,
} from "@/components/directory-section";
import { reconcileDirectoryAbsentActive } from "@/lib/directory-absent-clock";
import { loadDirectorySlice } from "@/lib/directory-page";
import {
  directoryListMode,
  directoryMemberWhereIgnoringListStatus,
  parseDirectoryFilters,
} from "@/lib/directory-query";
import { activeOnByGamertagMap } from "@/lib/minecraft-directory-sync";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

type Search = Record<string, string | string[] | undefined>;

export default async function DashboardListaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  let userId: string | null;
  try {
    userId = await resolveDirectoryUserId(session);
  } catch (error) {
    if (isDatabaseUnreachableError(error)) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }
  if (!userId) return null;

  const filters = parseDirectoryFilters(await searchParams);
  const whereForRosterCounts = directoryMemberWhereIgnoringListStatus(
    userId,
    filters,
  );

  let countryCodes: string[];
  let rosterCounts: { active: number; inactive: number; left: number };
  let list: DirectoryPageSlice | null = null;
  let columns: {
    active: DirectoryPageSlice;
    inactive: DirectoryPageSlice;
    left: DirectoryPageSlice;
  } | null = null;

  try {
    await reconcileDirectoryAbsentActive(userId);
    const activeOnByTag = await activeOnByGamertagMap().catch(
      () => new Map<string, ("vanilla" | "mods")[]>(),
    );
    const mode = directoryListMode(filters);
    const [countries, counts, pages] = await Promise.all([
      prisma.directoryMember.findMany({
        where: { userId, phoneCountry: { not: null } },
        select: { phoneCountry: true },
        distinct: ["phoneCountry"],
      }),
      (async () => {
        const [active, inactive, left] = await Promise.all([
          prisma.directoryMember.count({
            where: {
              AND: [whereForRosterCounts, { leftAt: null, active: true }],
            },
          }),
          prisma.directoryMember.count({
            where: {
              AND: [whereForRosterCounts, { leftAt: null, active: false }],
            },
          }),
          prisma.directoryMember.count({
            where: {
              AND: [whereForRosterCounts, { leftAt: { not: null } }],
            },
          }),
        ]);
        return { active, inactive, left };
      })(),
      mode === "split"
        ? Promise.all([
            loadDirectorySlice({
              userId,
              filters,
              lane: "active",
              cursor: null,
              activeOnByTag,
            }),
            loadDirectorySlice({
              userId,
              filters,
              lane: "inactive",
              cursor: null,
              activeOnByTag,
            }),
            loadDirectorySlice({
              userId,
              filters,
              lane: "left",
              cursor: null,
              activeOnByTag,
            }),
          ])
        : loadDirectorySlice({
            userId,
            filters,
            lane: null,
            cursor: null,
            activeOnByTag,
          }),
    ]);
    countryCodes = countries
      .map((row) => row.phoneCountry)
      .filter((code): code is string => Boolean(code));
    rosterCounts = counts;
    if (Array.isArray(pages)) {
      columns = { active: pages[0], inactive: pages[1], left: pages[2] };
    } else {
      list = pages;
    }
  } catch (error) {
    if (isDatabaseUnreachableError(error)) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Personas
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gamertag, celular, edad, strikes, baneos y filtros por rol o situación.
        </p>
      </div>
      <DirectorySection
        filters={filters}
        countryCodes={countryCodes}
        rosterCounts={rosterCounts}
        list={list}
        columns={columns}
      />
    </section>
  );
}
