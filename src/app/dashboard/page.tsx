import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  directoryMemberWhere,
  parseDirectoryFilters,
} from "@/lib/directory-query";
import { DirectorySection } from "@/components/directory-section";
import type { DirectoryMemberDTO } from "@/types/directory";

type Search = Record<string, string | string[] | undefined>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const sp = await searchParams;
  const filters = parseDirectoryFilters(sp);

  const whereMembers = directoryMemberWhere(userId, filters);

  const [membersRaw, countryRows] = await Promise.all([
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

  const countryCodes = countryRows
    .map((r) => r.phoneCountry)
    .filter((c): c is string => Boolean(c));

  const members: DirectoryMemberDTO[] = membersRaw.map((m) => ({
    id: m.id,
    gamertag: m.gamertag,
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
