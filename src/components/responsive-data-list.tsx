import type { ReactNode } from "react";

/** Tabla en escritorio, tarjetas apiladas en celular. */
export function ResponsiveDataList({
  isEmpty,
  empty,
  table,
  cards,
  className = "",
}: {
  isEmpty: boolean;
  empty?: ReactNode;
  table: ReactNode;
  cards: ReactNode;
  className?: string;
}) {
  if (isEmpty) {
    return (
      <div className={`px-4 py-8 text-center text-sm text-zinc-500 ${className}`}>
        {empty ?? "Sin resultados"}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">{table}</div>
      <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
        {cards}
      </ul>
    </>
  );
}

export function MobileListItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <li className={`px-3 py-3.5 ${className}`}>{children}</li>;
}

export function formatXyz(
  x: number | null,
  y: number | null,
  z: number | null,
): string {
  if (x == null || y == null || z == null) return "—";
  return `${x}, ${y}, ${z}`;
}
