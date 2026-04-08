import type { Prisma } from "@/generated/prisma";
import {
  DIRECTORY_NEW_MEMBER_DAYS,
  parseDirectoryCohort,
  type DirectoryCohort,
} from "@/lib/directory-cohort";

export type { DirectoryCohort };

export type DirectoryUrlFilters = {
  status: "all" | "active" | "inactive";
  view: "single" | "split";
  cohort: DirectoryCohort;
  country: string;
  q: string;
  banned: "all" | "only";
};

export function parseDirectoryFilters(
  raw: Record<string, string | string[] | undefined>,
): DirectoryUrlFilters {
  const g = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const status = g("status");
  const view = g("view");
  const country = (g("country") ?? "").trim().toUpperCase();
  const q = (g("q") ?? "").trim();
  const banned = g("banned");
  const cohort = parseDirectoryCohort(g("cohort"));

  return {
    status:
      status === "active"
        ? "active"
        : status === "inactive"
          ? "inactive"
          : "all",
    view: view === "split" ? "split" : "single",
    cohort,
    country: country.length === 2 ? country : "",
    q,
    banned: banned === "only" ? "only" : "all",
  };
}

export function directoryMemberWhere(
  userId: string,
  filters: DirectoryUrlFilters,
  now: Date = new Date(),
): Prisma.DirectoryMemberWhereInput {
  const parts: Prisma.DirectoryMemberWhereInput[] = [{ userId }];

  if (filters.status === "active") parts.push({ active: true });
  if (filters.status === "inactive") parts.push({ active: false });
  if (filters.country) parts.push({ phoneCountry: filters.country });
  if (filters.banned === "only") parts.push({ banned: true });

  switch (filters.cohort) {
    case "admins":
      parts.push({ isAdmin: true });
      break;
    case "protected":
      parts.push({ banExempt: true });
      break;
    case "roster":
      parts.push({ active: true, leftAt: null });
      break;
    case "new": {
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);
      parts.push({ createdAt: { gte: cutoff }, leftAt: null });
      break;
    }
    case "inactive":
      parts.push({ active: false, leftAt: null });
      break;
    case "left":
      parts.push({ leftAt: { not: null } });
      break;
    default:
      break;
  }

  const q = filters.q;
  if (q) {
    parts.push({
      OR: [
        { gamertag: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { notes: { contains: q, mode: "insensitive" } },
        { bannedReason: { contains: q, mode: "insensitive" } },
        {
          strikes: {
            some: { reason: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  return { AND: parts };
}
