import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { DirectorySection } from "@/components/directory-section";
import {
  directoryMemberWhere,
  parseDirectoryFilters,
} from "@/lib/directory-query";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import type { DirectoryMemberDTO } from "@/types/directory";

type Search = Record<string, string | string[] | undefined>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  let userId: string | null;
  try {
    userId = await resolveDirectoryUserId(session);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
  if (!userId) return null;

  const sp = await searchParams;
  const filters = parseDirectoryFilters(sp);

  const whereMembers = directoryMemberWhere(userId, filters);

  let membersRaw: Awaited<
    ReturnType<typeof prisma.directoryMember.findMany<{ include: { strikes: true } }>>
  >;
  let countryRows: { phoneCountry: string | null }[];

  try {
    [membersRaw, countryRows] = await Promise.all([
      prisma.directoryMember.findMany({
        where: whereMembers,
        include: {
          strikes: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.directoryMember.findMany({
        where: { userId, phoneCountry: { not: null } },
        select: { phoneCountry: true },
        distinct: ["phoneCountry"],
      }),
    ]);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }

  const countryCodes = countryRows
    .map((r) => r.phoneCountry)
    .filter((c): c is string => Boolean(c));

  const members: DirectoryMemberDTO[] = membersRaw.map((m) => ({
    id: m.id,
    gamertag: m.gamertag,
    displayName: m.displayName,
    phone: m.phone,
    phoneCountry: m.phoneCountry,
    active: m.active,
    isAdmin: m.isAdmin,
    banExempt: m.banExempt,
    leftAt: m.leftAt?.toISOString() ?? null,
    banned: m.banned,
    bannedReason: m.bannedReason,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    strikes: m.strikes.map((s) => ({
      id: s.id,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Personas
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gamertag, celular, strikes, baneos y filtros por rol o situación.
        </p>
      </div>
      <DirectorySection
        filters={filters}
        countryCodes={countryCodes}
        members={members}
      />
    </section>
  );
}
