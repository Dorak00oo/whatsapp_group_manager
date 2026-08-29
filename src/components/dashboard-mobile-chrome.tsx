"use client";

import { Suspense } from "react";
import { DashboardMobileMoreDrawer } from "@/components/dashboard-mobile-more-drawer";
import { DashboardMobileTabNav } from "@/components/dashboard-navigation";
import { MinecraftWorldSwitcher } from "@/components/minecraft-world-switcher";
import type { MinecraftServerId } from "@/lib/minecraft-server";

type Props = {
  defaultThemeDark: boolean;
  selectedWorld: MinecraftServerId;
  worldNames: Partial<Record<MinecraftServerId, string>>;
};

export function DashboardMobileChrome({
  defaultThemeDark,
  selectedWorld,
  worldNames,
}: Props) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex flex-col overflow-visible border-b border-zinc-200/90 bg-background/95 pb-1.5 pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md dark:border-zinc-800/90 md:hidden"
      role="presentation"
    >
      <div className="flex items-stretch gap-0 overflow-visible">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden px-0.5">
          <DashboardMobileTabNav />
        </div>
        <div className="relative z-[1] flex w-[3.25rem] shrink-0 flex-col justify-stretch overflow-visible border-l border-zinc-200/80 dark:border-zinc-800/70">
          <DashboardMobileMoreDrawer defaultThemeDark={defaultThemeDark} />
        </div>
      </div>
      <div className="px-2 pb-0.5 pt-1">
        <Suspense fallback={null}>
          <MinecraftWorldSwitcher
            selected={selectedWorld}
            names={worldNames}
            compact
          />
        </Suspense>
      </div>
    </div>
  );
}
