"use client";

import { signOut } from "next-auth/react";

function LogOutDoorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

type Props = {
  className?: string;
  compact?: boolean;
  /** Solo icono puerta/salida; hover rojo (barra lateral / móvil). */
  iconOnly?: boolean;
  /** Tamaño del botón circular cuando `iconOnly`. */
  iconOnlySize?: "md" | "sm";
};

export function SignOutButton({
  className,
  compact,
  iconOnly,
  iconOnlySize = "md",
}: Props) {
  if (iconOnly) {
    const circle =
      iconOnlySize === "sm" ? "size-9" : "size-12";
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className={`inline-flex ${circle} shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 ring-1 ring-zinc-900/10 transition-colors hover:bg-red-500/10 hover:text-red-600 hover:ring-red-400/45 dark:bg-zinc-900/40 dark:text-zinc-400 dark:ring-zinc-700/60 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:hover:ring-red-500/45 ${className ?? ""}`}
      >
        <LogOutDoorIcon
          className={iconOnlySize === "sm" ? "size-[18px]" : undefined}
        />
      </button>
    );
  }

  const size = compact
    ? "rounded-xl px-3 py-1.5 text-xs"
    : "rounded-2xl px-4 py-2 text-sm";
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`inline-flex items-center justify-center bg-white font-medium text-zinc-800 ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 dark:bg-zinc-900/90 dark:text-zinc-100 dark:ring-zinc-700/70 dark:hover:bg-zinc-800 ${size} ${className ?? ""}`}
    >
      Cerrar sesión
    </button>
  );
}
