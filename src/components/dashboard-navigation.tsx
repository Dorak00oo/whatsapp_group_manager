"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const iconSm = "size-5";

function IconList({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? iconSm}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? iconSm}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? iconSm}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

const linkBase =
  "flex size-12 items-center justify-center rounded-full transition-colors duration-200";

function useNavActive() {
  const pathname = usePathname();
  const list = pathname === "/dashboard";
  const add = pathname.startsWith("/dashboard/agregar");
  const bulk = pathname.startsWith("/dashboard/importar");
  return { list, add, bulk };
}

function activeCls(on: boolean) {
  return on
    ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-none"
    : "bg-white text-zinc-700 ring-1 ring-zinc-900/10 hover:bg-zinc-50 dark:bg-zinc-900/40 dark:text-zinc-300 dark:ring-zinc-700/60 dark:hover:bg-zinc-800/70";
}

/** Barra lateral estrecha con iconos (desktop / tablet). */
export function DashboardSidebarNav() {
  const { list, add, bulk } = useNavActive();

  return (
    <nav
      className="mx-auto flex w-fit flex-col items-center gap-2"
      aria-label="Secciones del panel"
    >
      <Link
        href="/dashboard"
        className={`${linkBase} ${activeCls(list)}`}
        title="Lista de personas"
        aria-current={list ? "page" : undefined}
      >
        <IconList />
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${linkBase} ${activeCls(add)}`}
        title="Agregar persona"
        aria-current={add ? "page" : undefined}
      >
        <IconUserPlus />
      </Link>
      <Link
        href="/dashboard/importar"
        className={`${linkBase} ${activeCls(bulk)}`}
        title="Importar y log"
        aria-current={bulk ? "page" : undefined}
      >
        <IconUpload />
      </Link>
    </nav>
  );
}

/** Solo iconos en fila (móvil); cerrar sesión va debajo en el layout. */
export function DashboardNavMobile() {
  const { list, add, bulk } = useNavActive();

  return (
    <nav
      className="flex w-full items-center justify-center gap-2"
      aria-label="Secciones del panel"
    >
      <Link
        href="/dashboard"
        className={`${linkBase} ${activeCls(list)}`}
        aria-current={list ? "page" : undefined}
      >
        <IconList />
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${linkBase} ${activeCls(add)}`}
        aria-current={add ? "page" : undefined}
      >
        <IconUserPlus />
      </Link>
      <Link
        href="/dashboard/importar"
        className={`${linkBase} ${activeCls(bulk)}`}
        aria-current={bulk ? "page" : undefined}
      >
        <IconUpload />
      </Link>
    </nav>
  );
}
