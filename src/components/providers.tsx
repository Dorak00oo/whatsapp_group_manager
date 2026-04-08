"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  children: React.ReactNode;
  defaultThemeDark: boolean;
};

function CornerThemeToggle({ defaultDark }: { defaultDark: boolean }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard")) return null;
  return <ThemeToggle defaultDark={defaultDark} />;
}

export function Providers({ children, defaultThemeDark }: Props) {
  return (
    <SessionProvider>
      {children}
      <CornerThemeToggle defaultDark={defaultThemeDark} />
    </SessionProvider>
  );
}
