import type { ReactNode } from "react";

/** Icono arriba, misma raya que el rail, etiqueta corta abajo. */
export function SidebarGlyphCaption({
  icon,
  caption,
}: {
  icon: ReactNode;
  caption: string;
}) {
  return (
    <>
      <span className="flex min-h-8 flex-1 items-center justify-center py-1.5">
        {icon}
      </span>
      <span
        className="mx-2 shrink-0 border-t border-current opacity-[0.22]"
        aria-hidden
      />
      <span
        className="px-0.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-tight"
        aria-hidden
      >
        {caption}
      </span>
    </>
  );
}

export const sidebarTileClass =
  "flex w-full min-w-0 flex-col items-stretch overflow-hidden rounded-xl transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-zinc-100/40 dark:focus-visible:ring-offset-zinc-950";

/** Superficie compartida: el color no identifica la tesela, solo el estado. */
const sidebarTileSurface =
  "bg-white/70 text-zinc-500 ring-1 ring-transparent dark:bg-zinc-900/50 dark:text-zinc-400";

export const sidebarTileIdleClass = `${sidebarTileSurface} hover:bg-zinc-50 hover:text-zinc-800 hover:ring-zinc-900/10 dark:hover:bg-zinc-800/75 dark:hover:text-zinc-200 dark:hover:ring-zinc-100/12`;

/** Contraste invertido para la sección activa — sin hue de categoría. */
export const sidebarTileActiveClass =
  "bg-zinc-900 text-white ring-1 ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100";

export const sidebarTileDangerClass = `${sidebarTileSurface} hover:bg-red-500/10 hover:text-red-600 hover:ring-red-400/40 dark:hover:bg-red-950/35 dark:hover:text-red-400 dark:hover:ring-red-500/40`;

export function sidebarTileStateClass(active: boolean) {
  return active ? sidebarTileActiveClass : sidebarTileIdleClass;
}

/** Separador entre grupos de teselas (más corto que el de tema / nav / salir). */
export const sidebarGroupRule =
  "mx-2 shrink-0 border-t border-zinc-300/40 dark:border-zinc-700/50";
