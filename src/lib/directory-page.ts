import type { Prisma } from "@/generated/prisma";
import {
  DIRECTORY_PAGE_SIZE,
  directoryCursorMatches,
  directoryCursorWhere,
  directoryLaneField,
  directoryLaneWhere,
  directoryListMode,
  directoryMemberWhere,
  encodeDirectoryCursor,
  type DirectoryColumnLane,
  type DirectoryCursorScope,
  type DirectoryPageCursor,
  type DirectoryUrlFilters,
} from "@/lib/directory-query";
import { memberActiveOnWorlds } from "@/lib/member-mc-accounts";
import { activeOnByGamertagMap } from "@/lib/minecraft-directory-sync";
import { prisma } from "@/lib/prisma";
import type { DirectoryMemberDTO } from "@/types/directory";

const memberInclude = {
  strikes: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.DirectoryMemberInclude;

type MemberRow = Prisma.DirectoryMemberGetPayload<{ include: typeof memberInclude }>;

function toDirectoryMemberDto(
  member: MemberRow,
  activeOnByTag: Map<string, ("vanilla" | "mods")[]>,
): DirectoryMemberDTO {
  return {
    id: member.id,
    gamertag: member.gamertag,
    mcAccount2: member.mcAccount2,
    mcAccount3: member.mcAccount3,
    displayName: member.displayName,
    age: member.age,
    phone: member.phone,
    phoneCountry: member.phoneCountry,
    whatsappUsername: member.whatsappUsername,
    active: member.active,
    activeOn: memberActiveOnWorlds(member, activeOnByTag),
    permanentlyActive: member.permanentlyActive,
    permanentlyActiveUntil: member.permanentlyActiveUntil?.toISOString() ?? null,
    absentWithCause: member.absentWithCause,
    absentReason: member.absentReason,
    isAdmin: member.isAdmin,
    banExempt: member.banExempt,
    leftAt: member.leftAt?.toISOString() ?? null,
    banned: member.banned,
    bannedReason: member.bannedReason,
    notes: member.notes,
    createdAt: member.createdAt.toISOString(),
    strikes: member.strikes.map((strike) => ({
      id: strike.id,
      kind: strike.kind === "definitive" ? "definitive" : "pending",
      reason: strike.reason,
      createdAt: strike.createdAt.toISOString(),
    })),
  };
}

function orderBy(
  field: "createdAt" | "leftAt",
): Prisma.DirectoryMemberOrderByWithRelationInput[] {
  if (field === "leftAt") return [{ leftAt: "desc" }, { id: "desc" }];
  return [{ createdAt: "desc" }, { id: "desc" }];
}

async function findMemberPage(args: {
  where: Prisma.DirectoryMemberWhereInput;
  field: "createdAt" | "leftAt";
  cursor: DirectoryPageCursor | null;
  scope: DirectoryCursorScope;
  take: number;
}): Promise<{ rows: MemberRow[]; nextCursor: DirectoryPageCursor | null }> {
  const where =
    args.cursor && args.cursor.scope === args.scope
      ? { AND: [args.where, directoryCursorWhere(args.field, args.cursor)] }
      : args.where;
  const rows = await prisma.directoryMember.findMany({
    where,
    orderBy: orderBy(args.field),
    take: args.take + 1,
    include: memberInclude,
  });
  const page = rows.slice(0, args.take);
  const last = page[page.length - 1];
  if (!last || rows.length <= args.take) {
    return { rows: page, nextCursor: null };
  }
  const stamp = args.field === "leftAt" ? last.leftAt : last.createdAt;
  if (!stamp) return { rows: page, nextCursor: null };
  return {
    rows: page,
    nextCursor: { scope: args.scope, at: stamp.toISOString(), id: last.id },
  };
}

export type DirectorySlice = {
  members: DirectoryMemberDTO[];
  nextCursor: string | null;
};

/**
 * Una tanda de la lista. El orden es el de `takeDirectoryPage`:
 * `createdAt` descendente (o `leftAt` en los salidos de la lista única) y `id` de desempate.
 */
export async function loadDirectorySlice(input: {
  userId: string;
  filters: DirectoryUrlFilters;
  lane: DirectoryColumnLane | null;
  cursor: DirectoryPageCursor | null;
  take?: number;
  now?: Date;
  activeOnByTag?: Map<string, ("vanilla" | "mods")[]>;
}): Promise<DirectorySlice> {
  const mode = directoryListMode(input.filters);
  const take = input.take ?? DIRECTORY_PAGE_SIZE;
  const now = input.now ?? new Date();
  if (input.cursor && !directoryCursorMatches(mode, input.lane, input.cursor)) {
    throw new Error("Cursor de lista inválido");
  }
  if (mode === "split" && !input.lane) {
    throw new Error("La vista dividida necesita una columna");
  }

  const base = directoryMemberWhere(input.userId, input.filters, now);
  const activeOnByTag =
    input.activeOnByTag ??
    (await activeOnByGamertagMap().catch(
      () => new Map<string, ("vanilla" | "mods")[]>(),
    ));

  let collected: MemberRow[] = [];
  let next: DirectoryPageCursor | null = null;

  if (mode === "split") {
    const lane = input.lane ?? "active";
    const page = await findMemberPage({
      where: { AND: [base, directoryLaneWhere(lane)] },
      field: directoryLaneField(mode, lane),
      cursor: input.cursor,
      scope: lane,
      take,
    });
    collected = page.rows;
    next = page.nextCursor;
  } else if (mode === "created") {
    const page = await findMemberPage({
      where: base,
      field: "createdAt",
      cursor: input.cursor,
      scope: "list",
      take,
    });
    collected = page.rows;
    next = page.nextCursor;
  } else {
    const lanes: DirectoryColumnLane[] = ["active", "inactive", "left"];
    let start = 0;
    if (input.cursor && input.cursor.scope !== "list") {
      const index = lanes.indexOf(input.cursor.scope);
      if (index >= 0) start = index;
    }
    for (let i = start; i < lanes.length && collected.length < take; i++) {
      const lane = lanes[i];
      const page = await findMemberPage({
        where: { AND: [base, directoryLaneWhere(lane)] },
        field: directoryLaneField("tiered", lane),
        cursor: i === start ? input.cursor : null,
        scope: lane,
        take: take - collected.length,
      });
      collected.push(...page.rows);
      if (page.nextCursor) {
        next = page.nextCursor;
        break;
      }
    }
  }

  return {
    members: collected.map((row) => toDirectoryMemberDto(row, activeOnByTag)),
    nextCursor: next ? encodeDirectoryCursor(next) : null,
  };
}
