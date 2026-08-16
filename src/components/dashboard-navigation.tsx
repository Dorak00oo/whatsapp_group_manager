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

/** Iconos circulares — lateral escritorio (carril estrecho). */
const linkBaseSidebar =
  "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200";

function IconParcel({ className }: { className?: string }) {
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
      <path d="M3 9h18v10H3z" />
      <path d="M9 9V5h6v4" />
      <path d="M3 14h18" />
    </svg>
  );
}

function IconCommands({ className }: { className?: string }) {
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
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function IconAdmin({ className }: { className?: string }) {
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
      <path d="M9 8h6" />
    </svg>
  );
}

function IconMonitor({ className }: { className?: string }) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Bloque / mundo Minecraft — mismo estilo de trazo que el resto del nav. */
function IconMinecraft({ className }: { className?: string }) {
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
      <path d="M12 2 2 7v10l10 5 10-5V7z" />
      <path d="M2 7l10 5 10-5" />
      <path d="M12 22V12" />
      <path d="m7.5 4.5 9 5" />
    </svg>
  );
}

function useNavActive() {
  const pathname = usePathname();
  const list = pathname === "/dashboard";
  const add = pathname.startsWith("/dashboard/agregar");
  const bulk = pathname.startsWith("/dashboard/administracion");
  const minecraft = pathname.startsWith("/dashboard/minecraft");
  const comandos = pathname.startsWith("/dashboard/comandos");
  const parcela = pathname.startsWith("/dashboard/parcela");
  const monitoreo = pathname.startsWith("/dashboard/monitoreo");
  return { list, add, bulk, minecraft, comandos, parcela, monitoreo };
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
  const { list, add, bulk, minecraft, comandos, parcela, monitoreo } =
    useNavActive();

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
        href="/dashboard/administracion"
        className={`${linkBaseSidebar} ${activeCls(bulk)}`}
        title="Administración de jugadores"
        aria-current={bulk ? "page" : undefined}
      >
        <IconAdmin className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/minecraft"
        className={`${linkBaseSidebar} ${activeCls(minecraft)}`}
        title="Jugadores de Minecraft"
        aria-current={minecraft ? "page" : undefined}
      >
        <IconMinecraft className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/parcela"
        className={`${linkBaseSidebar} ${activeCls(parcela)}`}
        title="Parcela"
        aria-current={parcela ? "page" : undefined}
      >
        <IconParcel className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/monitoreo"
        className={`${linkBaseSidebar} ${activeCls(monitoreo)}`}
        title="Monitoreo"
        aria-current={monitoreo ? "page" : undefined}
      >
        <IconMonitor className={iconSidebar} />
      </Link>
      <Link
        href="/dashboard/comandos"
        className={`${linkBaseSidebar} ${activeCls(comandos)}`}
        title="Comandos rápidos"
        aria-current={comandos ? "page" : undefined}
      >
        <IconCommands className={iconSidebar} />
      </Link>
    </nav>
  );
}

const tabBase =
  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors active:bg-zinc-200/60 dark:active:bg-zinc-800/60";

/** Navegación fija inferior (solo móvil): icono + etiqueta; el menú «Más» va aparte en el layout. */
export function DashboardMobileTabNav() {
  const { list, add, bulk, minecraft, comandos, parcela } = useNavActive();

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
        href="/dashboard/administracion"
        className={`${tabBase} ${activeTabCls(bulk)}`}
        aria-current={bulk ? "page" : undefined}
      >
        <IconAdmin className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Admin</span>
      </Link>
      <Link
        href="/dashboard/minecraft"
        className={`${tabBase} ${activeTabCls(minecraft)}`}
        aria-current={minecraft ? "page" : undefined}
      >
        <IconMinecraft className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">MC</span>
      </Link>
      <Link
        href="/dashboard/comandos"
        className={`${tabBase} ${activeTabCls(comandos)}`}
        aria-current={comandos ? "page" : undefined}
      >
        <IconCommands className="size-[1.125rem] shrink-0" />
        <span className="text-[10px] font-medium leading-none">Cmd</span>
      </Link>
    </nav>
  );
}
