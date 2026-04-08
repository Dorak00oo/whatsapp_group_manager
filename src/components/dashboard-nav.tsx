"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabClass =
  "rounded-lg px-4 py-2 text-sm font-medium transition-colors border";

export function DashboardNav() {
  const pathname = usePathname();
  const list = pathname === "/dashboard";
  const add = pathname === "/dashboard/agregar";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <Link
        href="/dashboard"
        className={`${tabClass} ${
          list
            ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
            : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        Lista de personas
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${tabClass} ${
          add
            ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
            : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        Agregar persona
      </Link>
    </nav>
  );
}
