/**
 * Estética soft-minimal: crema, superficies beige, pastels planos, radios grandes.
 */

export const softPanel =
  "flex w-full min-w-0 flex-col gap-4 rounded-[1.75rem] border border-zinc-200/70 bg-white p-4 shadow-sm shadow-zinc-900/[0.04] sm:p-5 dark:border-zinc-800/90 dark:bg-zinc-950/90 dark:shadow-none";

const field =
  "rounded-2xl border-0 px-4 py-2.5 text-sm outline-none transition focus:outline-none focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-0";

/** Campos de formulario (input, select, textarea) en tono zinc, sin acentos de color. */
export const softInputNeutral = `${field} bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200/90 placeholder:text-zinc-400 focus:ring-zinc-900/15 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800/80 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400/20`;

/**
 * Igual que {@link softInputNeutral} pero sin pintura nativa del navegador en `<select>`
 * (flecha en caja gris / borde de acento al hover o foco). Flecha SVG + `accent-*` neutro.
 */
export const softSelectNeutral =
  `${softInputNeutral} cursor-pointer appearance-none bg-[length:1.125rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 accent-zinc-600 dark:accent-zinc-500 ` +
  `bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2352525b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] ` +
  `dark:bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]`;

export const softBtnPrimary =
  "rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export const softBtnMint =
  "rounded-2xl bg-emerald-200 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-emerald-300 disabled:opacity-60 dark:bg-emerald-800/80 dark:text-emerald-50 dark:hover:bg-emerald-700/80";

export const softBtnLavender =
  "rounded-2xl bg-violet-200 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-violet-300 disabled:opacity-60 dark:bg-violet-800/70 dark:text-violet-50 dark:hover:bg-violet-700/70";

export const softBtnPeach =
  "rounded-2xl bg-amber-200 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-amber-300 disabled:opacity-60 dark:bg-amber-800/70 dark:text-amber-50 dark:hover:bg-amber-700/70";
