"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";
import { setSelectedMinecraftWorld } from "@/app/dashboard/minecraft-world-actions";
import {
  MINECRAFT_SERVER_IDS,
  parseMinecraftServerId,
  type MinecraftServerId,
} from "@/lib/minecraft-server";

export function isMinecraftWorldRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard/minecraft") ||
    pathname.startsWith("/dashboard/parcela") ||
    pathname.startsWith("/dashboard/monitoreo") ||
    pathname.startsWith("/dashboard/comandos") ||
    pathname.startsWith("/dashboard/ajustes") ||
    pathname.startsWith("/dashboard/administracion")
  );
}

type Props = {
  selected: MinecraftServerId;
  names?: Partial<Record<MinecraftServerId, string>>;
  compact?: boolean;
};

function VanillaGlyph() {
  return (
    <svg
      className="size-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="M4 7l8 4 8-4" />
      <path d="M12 11v10" />
    </svg>
  );
}

function ModsGlyph() {
  return (
    <svg
      className="size-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v3" />
      <path d="m8 5 1.5 2.5" />
      <path d="m16 5-1.5 2.5" />
      <rect x="6" y="10" width="12" height="10" rx="2" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
      <path d="M9 18h6" />
    </svg>
  );
}

const SELECTED: Record<MinecraftServerId, string> = {
  vanilla:
    "bg-emerald-200 text-zinc-900 shadow-sm dark:bg-emerald-800/85 dark:text-emerald-50",
  mods: "bg-violet-200 text-zinc-900 shadow-sm dark:bg-violet-800/80 dark:text-violet-50",
};

export function MinecraftWorldSwitcher({
  selected,
  names = {},
  compact = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const visible = isMinecraftWorldRoute(pathname);

  const applyWorld = useCallback(
    async (id: MinecraftServerId) => {
      await setSelectedMinecraftWorld(id);
      if (pathname.startsWith("/dashboard/parcela/")) {
        router.push("/dashboard/parcela");
        return;
      }
      router.refresh();
    },
    [pathname, router],
  );

  useEffect(() => {
    if (!visible) return;
    const fromQuery = parseMinecraftServerId(searchParams.get("world"));
    if (!fromQuery || fromQuery === selected) return;
    startTransition(async () => {
      await applyWorld(fromQuery);
    });
  }, [searchParams, selected, visible, applyWorld]);

  if (!visible) {
    return null;
  }

  function choose(id: MinecraftServerId) {
    if (id === selected || pending) return;
    startTransition(async () => {
      await applyWorld(id);
    });
  }

  return (
    <div
      role="group"
      aria-label="Mundo de Minecraft"
      className={`inline-flex max-w-full items-center rounded-full bg-zinc-200/90 p-1 dark:bg-zinc-800/90 ${compact ? "" : "mt-3"}`}
    >
      {MINECRAFT_SERVER_IDS.map((id) => {
        const on = id === selected;
        const label = names[id] ?? (id === "vanilla" ? "Vanilla" : "Mods");
        return (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => choose(id)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-[color,background-color,box-shadow] duration-200 disabled:opacity-60 ${
              on ? SELECTED[id] : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {id === "vanilla" ? <VanillaGlyph /> : <ModsGlyph />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
