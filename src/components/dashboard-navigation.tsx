"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { scrollOverflowSides } from "@/lib/scroll-overflow-sides";
import { SidebarGlyphCaption, sidebarTileClass } from "@/components/sidebar-glyph-caption";

const iconSm = "size-5";
const iconSidebar = "size-7";

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

/** Teselas del carril: icono, raya, etiqueta corta. */
const linkBaseSidebar = sidebarTileClass;

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

function IconSettings({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
      <rect x="5" y="8" width="14" height="10" rx="3" />
      <path d="M12 8V4" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M9 18v2" />
      <path d="M15 18v2" />
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
  const bot = pathname.startsWith("/dashboard/bot");
  const ajustes = pathname.startsWith("/dashboard/ajustes");
  return { list, add, bulk, minecraft, comandos, parcela, monitoreo, bot, ajustes };
}

type NavHue =
  | "sky"
  | "cyan"
  | "amber"
  | "lime"
  | "teal"
  | "violet"
  | "green"
  | "orange"
  | "blue";

/** Seleccionado = color intenso. Reposo = misma tinta, más gris y menos saturada. */
function navHueCls(on: boolean, hue: NavHue) {
  const idle: Record<NavHue, string> = {
    sky: "bg-sky-200/45 text-sky-800/50 hover:bg-sky-200/70 hover:text-sky-800/75 dark:bg-sky-950/40 dark:text-sky-300/40 dark:hover:bg-sky-950/55 dark:hover:text-sky-300/65",
    cyan: "bg-cyan-200/45 text-cyan-800/50 hover:bg-cyan-200/70 hover:text-cyan-800/75 dark:bg-cyan-950/40 dark:text-cyan-300/40 dark:hover:bg-cyan-950/55 dark:hover:text-cyan-300/65",
    amber:
      "bg-amber-200/45 text-amber-900/50 hover:bg-amber-200/70 hover:text-amber-900/75 dark:bg-amber-950/40 dark:text-amber-300/40 dark:hover:bg-amber-950/55 dark:hover:text-amber-300/65",
    lime: "bg-lime-200/45 text-lime-800/50 hover:bg-lime-200/70 hover:text-lime-800/75 dark:bg-lime-950/40 dark:text-lime-300/40 dark:hover:bg-lime-950/55 dark:hover:text-lime-300/65",
    teal: "bg-teal-200/45 text-teal-800/50 hover:bg-teal-200/70 hover:text-teal-800/75 dark:bg-teal-950/40 dark:text-teal-300/40 dark:hover:bg-teal-950/55 dark:hover:text-teal-300/65",
    violet:
      "bg-violet-200/45 text-violet-800/50 hover:bg-violet-200/70 hover:text-violet-800/75 dark:bg-violet-950/40 dark:text-violet-300/40 dark:hover:bg-violet-950/55 dark:hover:text-violet-300/65",
    green:
      "bg-green-200/45 text-green-800/50 hover:bg-green-200/70 hover:text-green-800/75 dark:bg-green-950/40 dark:text-green-300/40 dark:hover:bg-green-950/55 dark:hover:text-green-300/65",
    orange:
      "bg-orange-200/45 text-orange-800/50 hover:bg-orange-200/70 hover:text-orange-800/75 dark:bg-orange-950/40 dark:text-orange-300/40 dark:hover:bg-orange-950/55 dark:hover:text-orange-300/65",
    blue: "bg-blue-200/45 text-blue-800/50 hover:bg-blue-200/70 hover:text-blue-800/75 dark:bg-blue-950/40 dark:text-blue-300/40 dark:hover:bg-blue-950/55 dark:hover:text-blue-300/65",
  };
  const active: Record<NavHue, string> = {
    sky: "bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950",
    cyan: "bg-cyan-600 text-white dark:bg-cyan-400 dark:text-cyan-950",
    amber: "bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950",
    lime: "bg-lime-600 text-white dark:bg-lime-400 dark:text-lime-950",
    teal: "bg-teal-600 text-white dark:bg-teal-400 dark:text-teal-950",
    violet: "bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950",
    green: "bg-green-600 text-white dark:bg-green-400 dark:text-green-950",
    orange: "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950",
    blue: "bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950",
  };
  return on ? active[hue] : idle[hue];
}

function activeTabCls(on: boolean) {
  return on
    ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800/85 dark:text-zinc-50"
    : "text-zinc-500 dark:text-zinc-400";
}

/** Barra lateral: iconos pequeños (md+). */
export function DashboardSidebarNav() {
  const { list, add, bulk, minecraft, comandos, parcela, monitoreo, bot, ajustes } =
    useNavActive();

  return (
    <nav
      className="grid w-full grid-cols-2 gap-x-1 gap-y-2"
      aria-label="Secciones del panel"
    >
      <Link
        href="/dashboard"
        className={`${linkBaseSidebar} ${navHueCls(list, "sky")}`}
        title="Lista de personas"
        aria-label="Lista de personas"
        aria-current={list ? "page" : undefined}
      >
        <SidebarGlyphCaption icon={<IconList className={iconSidebar} />} caption="Lista" />
      </Link>
      <Link
        href="/dashboard/agregar"
        className={`${linkBaseSidebar} ${navHueCls(add, "cyan")}`}
        title="Agregar persona"
        aria-label="Agregar persona"
        aria-current={add ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconUserPlus className={iconSidebar} />}
          caption="Agregar"
        />
      </Link>
      <Link
        href="/dashboard/administracion"
        className={`${linkBaseSidebar} ${navHueCls(bulk, "amber")}`}
        title="Administración de jugadores"
        aria-label="Administración de jugadores"
        aria-current={bulk ? "page" : undefined}
      >
        <SidebarGlyphCaption icon={<IconAdmin className={iconSidebar} />} caption="Admin" />
      </Link>
      <Link
        href="/dashboard/minecraft"
        className={`${linkBaseSidebar} ${navHueCls(minecraft, "lime")}`}
        title="Jugadores de Minecraft"
        aria-label="Jugadores de Minecraft"
        aria-current={minecraft ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconMinecraft className={iconSidebar} />}
          caption="MC"
        />
      </Link>
      <Link
        href="/dashboard/parcela"
        className={`${linkBaseSidebar} ${navHueCls(parcela, "teal")}`}
        title="Parcela"
        aria-label="Parcela"
        aria-current={parcela ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconParcel className={iconSidebar} />}
          caption="Parcela"
        />
      </Link>
      <Link
        href="/dashboard/monitoreo"
        className={`${linkBaseSidebar} ${navHueCls(monitoreo, "violet")}`}
        title="Monitoreo"
        aria-label="Monitoreo"
        aria-current={monitoreo ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconMonitor className={iconSidebar} />}
          caption="Monitor"
        />
      </Link>
      <Link
        href="/dashboard/bot"
        className={`${linkBaseSidebar} ${navHueCls(bot, "green")}`}
        title="Bot de WhatsApp"
        aria-label="Bot de WhatsApp"
        aria-current={bot ? "page" : undefined}
      >
        <SidebarGlyphCaption icon={<IconBot className={iconSidebar} />} caption="Bot" />
      </Link>
      <Link
        href="/dashboard/comandos"
        className={`${linkBaseSidebar} ${navHueCls(comandos, "orange")}`}
        title="Comandos rápidos"
        aria-label="Comandos rápidos"
        aria-current={comandos ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconCommands className={iconSidebar} />}
          caption="Cmd"
        />
      </Link>
      <Link
        href="/dashboard/ajustes"
        className={`${linkBaseSidebar} ${navHueCls(ajustes, "blue")}`}
        title="Ajustes de Minecraft"
        aria-label="Ajustes de Minecraft"
        aria-current={ajustes ? "page" : undefined}
      >
        <SidebarGlyphCaption
          icon={<IconSettings className={iconSidebar} />}
          caption="Ajustes"
        />
      </Link>
    </nav>
  );
}

const tabBase =
  "flex min-h-12 w-[3.15rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors active:bg-zinc-200/60 dark:active:bg-zinc-800/60";

const SCROLL_STEP_PX = 140;

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ScrollSideHint({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const isLeft = side === "left";
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-y-0 z-[1] w-11 ${
          isLeft
            ? "left-0 bg-gradient-to-r from-background from-35% to-transparent"
            : "right-0 bg-gradient-to-l from-background from-35% to-transparent"
        }`}
        aria-hidden
      />
      <button
        type="button"
        onClick={onClick}
        className={`absolute top-1/2 z-[2] flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-900/85 text-white shadow-sm dark:bg-zinc-100/90 dark:text-zinc-900 ${
          isLeft ? "left-0.5" : "right-0.5"
        }`}
        aria-label={
          isLeft ? "Ver secciones anteriores" : "Ver más secciones"
        }
      >
        {isLeft ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </button>
    </>
  );
}

/** Navegación superior móvil: todas las secciones, scroll horizontal. */
export function DashboardMobileTabNav() {
  const pathname = usePathname();
  const { list, add, bulk, minecraft, comandos, parcela, monitoreo, bot, ajustes } =
    useNavActive();
  const scrollerRef = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measureOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflow(
      scrollOverflowSides(el.scrollLeft, el.clientWidth, el.scrollWidth),
    );
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measureOverflow();
    el.addEventListener("scroll", measureOverflow, { passive: true });
    const ro = new ResizeObserver(measureOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measureOverflow);
      ro.disconnect();
    };
  }, [measureOverflow]);

  useEffect(() => {
    const current = scrollerRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    current?.scrollIntoView({ inline: "nearest", block: "nearest" });
    measureOverflow();
  }, [pathname, measureOverflow]);

  const scrollByDir = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left: dir * SCROLL_STEP_PX,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative min-w-0 w-full">
      {overflow.left ? (
        <ScrollSideHint side="left" onClick={() => scrollByDir(-1)} />
      ) : null}
      {overflow.right ? (
        <ScrollSideHint side="right" onClick={() => scrollByDir(1)} />
      ) : null}
      <nav
        ref={scrollerRef}
        className="flex w-full min-w-0 items-stretch gap-0.5 overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Secciones del panel"
      >
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
          href="/dashboard/parcela"
          className={`${tabBase} ${activeTabCls(parcela)}`}
          aria-current={parcela ? "page" : undefined}
        >
          <IconParcel className="size-[1.125rem] shrink-0" />
          <span className="text-[10px] font-medium leading-none">Parcela</span>
        </Link>
        <Link
          href="/dashboard/monitoreo"
          className={`${tabBase} ${activeTabCls(monitoreo)}`}
          aria-current={monitoreo ? "page" : undefined}
        >
          <IconMonitor className="size-[1.125rem] shrink-0" />
          <span className="text-[10px] font-medium leading-none">Monitor</span>
        </Link>
        <Link
          href="/dashboard/bot"
          className={`${tabBase} ${activeTabCls(bot)}`}
          aria-current={bot ? "page" : undefined}
        >
          <IconBot className="size-[1.125rem] shrink-0" />
          <span className="text-[10px] font-medium leading-none">Bot</span>
        </Link>
        <Link
          href="/dashboard/comandos"
          className={`${tabBase} ${activeTabCls(comandos)}`}
          aria-current={comandos ? "page" : undefined}
        >
          <IconCommands className="size-[1.125rem] shrink-0" />
          <span className="text-[10px] font-medium leading-none">Cmd</span>
        </Link>
        <Link
          href="/dashboard/ajustes"
          className={`${tabBase} ${activeTabCls(ajustes)}`}
          aria-current={ajustes ? "page" : undefined}
        >
          <IconSettings className="size-[1.125rem] shrink-0" />
          <span className="text-[10px] font-medium leading-none">Ajustes</span>
        </Link>
      </nav>
    </div>
  );
}
