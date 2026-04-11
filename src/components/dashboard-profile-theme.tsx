"use client";

import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  defaultThemeDark: boolean;
  /** Botones sol/luna más chicos (rail lateral estrecho). */
  columnCompact?: boolean;
  /** Subtítulos «Claro» / «Oscuro» bajo cada botón. */
  columnShowLabels?: boolean;
};

export function DashboardProfileTheme({
  defaultThemeDark,
  columnCompact = false,
  columnShowLabels = false,
}: Props) {
  return (
    <ThemeToggle
      defaultDark={defaultThemeDark}
      layout="column"
      columnCompact={columnCompact}
      columnShowLabels={columnShowLabels}
      wrapperClassName={
        columnCompact
          ? "flex flex-col items-center gap-1.5"
          : "flex flex-col items-center gap-2"
      }
    />
  );
}
