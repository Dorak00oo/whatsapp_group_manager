import { memberIsNew } from "@/lib/directory-cohort";
import type { DirectoryMemberDTO } from "@/types/directory";

const base =
  "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ring-1 ring-zinc-900/10 dark:ring-white/10";

type Props = { m: DirectoryMemberDTO; compact?: boolean };

/**
 * Los seis roles / situaciones que pediste, visibles juntos en cada ficha.
 * `compact`: etiquetas cortas y sin título de sección (vista lista).
 */
export function DirectoryMemberRoleChips({ m, compact }: Props) {
  const isNew = memberIsNew(m.createdAt, m.leftAt);

  const chips: { key: string; label: string; short: string; className: string }[] =
    [];

  if (m.isAdmin) {
    chips.push({
      key: "admin",
      label: "Admin",
      short: "Admin",
      className: `${base} bg-fuchsia-200 text-fuchsia-950 ring-fuchsia-400/85 dark:bg-fuchsia-950/75 dark:text-fuchsia-200 dark:ring-fuchsia-700/65`,
    });
  }
  if (m.banExempt) {
    chips.push({
      key: "protected",
      label: "Protegido (sin ban)",
      short: "Protegido",
      className: `${base} bg-cyan-200 text-cyan-950 ring-cyan-300/80 dark:bg-cyan-900/45 dark:text-cyan-100 dark:ring-cyan-700/50`,
    });
  }
  if (m.leftAt) {
    chips.push({
      key: "left",
      label: "Los que se salieron",
      short: "Salió",
      className: `${base} bg-amber-100 text-amber-950 ring-amber-400/90 dark:bg-amber-950/75 dark:text-amber-100 dark:ring-amber-600/70`,
    });
  } else if (m.active) {
    chips.push({
      key: "roster",
      label: "Los que estuvieron activos",
      short: "Activo",
      className: `${base} bg-emerald-200 text-emerald-950 ring-emerald-500/95 dark:bg-emerald-950/85 dark:text-emerald-50 dark:ring-emerald-500`,
    });
  } else {
    chips.push({
      key: "inactive",
      label: "Los inactivos",
      short: "Inactivo",
      className: `${base} bg-slate-200 text-slate-900 ring-slate-400/90 dark:bg-slate-800/90 dark:text-slate-100 dark:ring-slate-500/70`,
    });
  }
  if (isNew && !m.leftAt) {
    chips.push({
      key: "new",
      label: "Los nuevos",
      short: "Nuevo",
      className: `${base} bg-lime-200 text-lime-950 ring-lime-300/80 dark:bg-lime-900/45 dark:text-lime-100 dark:ring-lime-700/50`,
    });
  }
  if (m.banned) {
    chips.push({
      key: "banned",
      label: "Baneado",
      short: "Ban",
      className: `${base} bg-red-200 text-red-950 ring-2 ring-red-600/95 dark:bg-red-950/85 dark:text-red-50 dark:ring-red-500`,
    });
  }

  const wrap = compact ? "mt-0" : "mt-2 flex flex-col gap-1.5";

  return (
    <div className={wrap}>
      {!compact ? (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Roles y situación
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c.key} className={compact ? `${c.className} py-0.5` : c.className}>
            {compact ? c.short : c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
