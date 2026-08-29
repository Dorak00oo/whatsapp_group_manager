"use client";

import type { MinecraftServerId } from "@/lib/minecraft-server";

/** Remonta el contenido del dashboard al cambiar de mundo para no dejar estado cliente viejo. */
export function MinecraftWorldScope({
  serverId,
  children,
}: {
  serverId: MinecraftServerId;
  children: React.ReactNode;
}) {
  return <div key={serverId}>{children}</div>;
}
