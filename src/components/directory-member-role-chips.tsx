import { memberIsNew } from "@/lib/directory-cohort";
import type { DirectoryMemberDTO } from "@/types/directory";

const base = "rounded-full px-2 py-0.5 text-xs font-medium";

/**
 * Los seis roles / situaciones que pediste, visibles juntos en cada ficha.
 */
export function DirectoryMemberRoleChips({ m }: { m: DirectoryMemberDTO }) {
  const isNew = memberIsNew(m.createdAt, m.leftAt);

  const chips: { key: string; label: string; className: string }[] = [];

  if (m.isAdmin) {
    chips.push({
      key: "admin",
      label: "Admin",
      className: `${base} bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200`,
    });
  }
  if (m.banExempt) {
    chips.push({
      key: "protected",
      label: "Protegido (sin ban)",
      className: `${base} bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200`,
    });
  }
  if (m.leftAt) {
    chips.push({
      key: "left",
      label: "Los que se salieron",
      className: `${base} bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200`,
    });
  } else if (m.active) {
    chips.push({
      key: "roster",
      label: "Los que estuvieron activos",
      className: `${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200`,
    });
  } else {
    chips.push({
      key: "inactive",
      label: "Los inactivos",
      className: `${base} bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200`,
    });
  }
  if (isNew && !m.leftAt) {
    chips.push({
      key: "new",
      label: "Los nuevos",
      className: `${base} bg-lime-100 text-lime-950 dark:bg-lime-950 dark:text-lime-200`,
    });
  }
  if (m.banned) {
    chips.push({
      key: "banned",
      label: "Baneado",
      className: `${base} bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200`,
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Roles y situación
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c.key} className={c.className}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
