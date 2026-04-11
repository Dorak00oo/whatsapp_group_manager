"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const iconSm = "size-5";
const iconSidebar = "size-[18px]";

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

/** Iconos circulares — lateral escritorio (carril estrecho). */
const linkBaseSidebar =
  "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200";

function IconBot({ className }: { className?: string }) {
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
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function useNavActive() {
  const pathname = usePathname();
  const list = pathname === "/dashboard";
  const add = pathname.startsWith("/dashboard/agregar");
  const bulk = pathname.startsWith("/dashboard/importar");
  const bot = pathname.startsWith("/dashboard/bot");
  return { list, add, bulk, bot };
}

function activeCls(on: boolean) {
  return on
    ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-none"
    : "bg-white text-zinc-700 ring-1 ring-zinc-900/10 hover:bg-zinc-50 dark:bg-zinc-900/40 dark:text-zinc-300 dark:ring-zinc-700/60 dark:hover:bg-zinc-800/70";
}

function activeTabCls(on: boolean) {
  return on
    ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800/85 dark:text-zinc-50"
    : "text-zinc-500 dark:text-zinc-400";
}

/** Barra lateral: iconos pequeños (md+). */
export function DashboardSidebarNav() {
  const { list, add, bulk, bot } = useNavActive();

  return (
    <nav
      className="flex w-full flex-col items-center gap-2"
      aria-label="Secciones del panel"
    >
      <Link
        href="/dashboard"
        className={`${linkBaseSidebar} ${activeCls(list)}`}
        title="Lista de personas"
        aria-current={list ? "page" : undefined}
      >
        <IconList className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${linkBaseSidebar} ${activeCls(add)}`}
        title="Agregar persona"
        aria-current={add ? "page" : undefined}
      >
        <IconUserPlus className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/importar"
        className={`${linkBaseSidebar} ${activeCls(bulk)}`}
        title="Importar y log"
        aria-current={bulk ? "page" : undefined}
      >
        <IconUpload className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/bot"
        className={`${linkBaseSidebar} ${activeCls(bot)}`}
        title="Bot WhatsApp"
        aria-current={bot ? "page" : undefined}
      >
        <IconBot className={iconSidebar} />
      </Link>
    </nav>
  );
}

const tabBase =
  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors active:bg-zinc-200/60 dark:active:bg-zinc-800/60";

/** Navegación fija inferior (solo móvil): icono + etiqueta; el menú «Más» va aparte en el layout. */
export function DashboardMobileTabNav() {
  const { list, add, bulk, bot } = useNavActive();

  return (
    <nav className="flex w-full min-w-0 items-stretch justify-between gap-0.5">
      <Link
        href="/dashboard"
        className={`${tabBase} ${activeTabCls(list)}`}
        aria-current={list ? "page" : undefined}
      >
        <IconList className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Lista</span>
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${tabBase} ${activeTabCls(add)}`}
        aria-current={add ? "page" : undefined}
      >
        <IconUserPlus className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Agregar</span>
      </Link>
      <Link
        href="/dashboard/importar"
        className={`${tabBase} ${activeTabCls(bulk)}`}
        aria-current={bulk ? "page" : undefined}
      >
        <IconUpload className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Importar</span>
      </Link>
      <Link
        href="/dashboard/bot"
        className={`${tabBase} ${activeTabCls(bot)}`}
        aria-current={bot ? "page" : undefined}
      >
        <IconBot className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Bot</span>
      </Link>
    </nav>
  );
}
