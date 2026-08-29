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
        className="mx-2 shrink-0 border-t border-zinc-300/45 dark:border-zinc-700/55"
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
  "flex w-full min-w-0 flex-col items-stretch overflow-hidden rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-zinc-100/40 dark:focus-visible:ring-offset-zinc-950";
