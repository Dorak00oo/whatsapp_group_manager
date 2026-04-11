"use client";

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";

const THEME_COOKIE_ATTRS = "path=/;max-age=31536000;SameSite=Lax";

function subscribeTheme(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}

function isDarkFromDom(): boolean {
  return document.documentElement.classList.contains("dark");
}

function SunIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

type Props = {
  /** Coincide con la cookie `theme` leída en el layout (evita mismatch de hidratación). */
  defaultDark: boolean;
  /** Sustituye el contenedor fijo de la esquina (p. ej. panel de perfil en /dashboard). */
  wrapperClassName?: string;
  /** Botones más pequeños (barra de perfil / cabecera). */
  compact?: boolean;
  /** `segmented` = control tipo pestaña (p. ej. móvil). */
  layout?: "row" | "column" | "segmented";
  /** En columna: botones más chicos (rail lateral estrecho). */
  columnCompact?: boolean;
  /** En columna: subtítulos «Claro» / «Oscuro» bajo cada botón. */
  columnShowLabels?: boolean;
};

const defaultWrapperClass =
  "fixed right-4 top-4 z-[100] flex gap-1 rounded-2xl bg-zinc-100 p-1 ring-1 ring-zinc-200/90 dark:bg-zinc-900/95 dark:ring-zinc-700/70";

export function ThemeToggle({
  defaultDark,
  wrapperClassName,
  compact,
  layout = "row",
  columnCompact = false,
  columnShowLabels = false,
}: Props) {
  const router = useRouter();
  const isDark = useSyncExternalStore(
    subscribeTheme,
    isDarkFromDom,
    () => defaultDark,
  );

  const setLight = useCallback(() => {
    document.documentElement.classList.remove("dark");
    document.cookie = `theme=light;${THEME_COOKIE_ATTRS}`;
    router.refresh();
  }, [router]);

  const setDark = useCallback(() => {
    document.documentElement.classList.add("dark");
    document.cookie = `theme=dark;${THEME_COOKIE_ATTRS}`;
    router.refresh();
  }, [router]);

  const pad = compact ? "p-1.5" : "p-2";
  const rad = compact ? "rounded-lg" : "rounded-xl";
  const icon = compact ? 18 : 20;

  const columnBtn = columnCompact
    ? "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200"
    : "flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-200";
  const columnIcon = columnCompact ? 18 : 22;
  const columnActive =
    "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-none";
  const columnIdle =
    "bg-white text-zinc-600 ring-1 ring-zinc-900/10 hover:bg-zinc-50 dark:bg-zinc-900/40 dark:text-zinc-400 dark:ring-zinc-700/60 dark:hover:bg-zinc-800/70";

  if (layout === "segmented") {
    const segBtn = (active: boolean) =>
      active
        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 dark:bg-zinc-600 dark:text-zinc-50 dark:ring-zinc-500/40"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";
    return (
      <div
        className={
          wrapperClassName ??
          "inline-flex min-w-0 flex-1 rounded-full bg-zinc-200/85 p-0.5 ring-1 ring-zinc-300/50 dark:bg-zinc-800/90 dark:ring-zinc-600/50"
        }
        role="group"
        aria-label="Tema de la interfaz"
      >
        <button
          type="button"
          onClick={setLight}
          aria-pressed={!isDark}
          aria-label="Tema día (claro)"
          className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${segBtn(!isDark)}`}
        >
          <SunIcon size={17} />
          Claro
        </button>
        <button
          type="button"
          onClick={setDark}
          aria-pressed={isDark}
          aria-label="Tema noche (oscuro)"
          className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${segBtn(isDark)}`}
        >
          <MoonIcon size={17} />
          Oscuro
        </button>
      </div>
    );
  }

  if (layout === "column") {
    const wrapLabel = (
      label: string,
      node: ReactNode,
    ) =>
      columnShowLabels ? (
        <div className="flex flex-col items-center gap-1">
          {node}
          <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
            {label}
          </span>
        </div>
      ) : (
        node
      );

    return (
      <div
        className={wrapperClassName ?? "flex flex-col items-center gap-2"}
        role="group"
        aria-label="Tema de la interfaz"
      >
        {wrapLabel(
          "Claro",
          <button
            type="button"
            onClick={setLight}
            aria-pressed={!isDark}
            aria-label="Modo claro"
            title="Modo claro"
            className={`${columnBtn} ${!isDark ? columnActive : columnIdle}`}
          >
            <SunIcon size={columnIcon} />
          </button>
        )}
        {wrapLabel(
          "Oscuro",
          <button
            type="button"
            onClick={setDark}
            aria-pressed={isDark}
            aria-label="Modo oscuro"
            title="Modo oscuro"
            className={`${columnBtn} ${isDark ? columnActive : columnIdle}`}
          >
            <MoonIcon size={columnIcon} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={wrapperClassName ?? defaultWrapperClass}
      role="group"
      aria-label="Tema de la interfaz"
    >
      <button
        type="button"
        onClick={setLight}
        aria-pressed={!isDark}
        aria-label="Modo claro"
        title="Modo claro"
        className={`${rad} ${pad} transition ${
          !isDark
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-100"
        }`}
      >
        <SunIcon size={icon} />
      </button>
      <button
        type="button"
        onClick={setDark}
        aria-pressed={isDark}
        aria-label="Modo oscuro"
        title="Modo oscuro"
        className={`${rad} ${pad} transition ${
          isDark
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-100"
        }`}
      >
        <MoonIcon size={icon} />
      </button>
    </div>
  );
}
