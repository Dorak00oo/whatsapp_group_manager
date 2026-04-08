"use client";

import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  defaultThemeDark: boolean;
};

export function DashboardProfileTheme({ defaultThemeDark }: Props) {
  return (
    <ThemeToggle
      defaultDark={defaultThemeDark}
      layout="column"
      wrapperClassName="flex flex-col items-center gap-2"
    />
  );
}
