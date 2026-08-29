import { cookies } from "next/headers";
import {
  MC_WORLD_COOKIE,
  parseMinecraftWorldCookie,
  type MinecraftServerId,
} from "@/lib/minecraft-server";

export async function selectedMinecraftServerId(): Promise<MinecraftServerId> {
  const store = await cookies();
  return parseMinecraftWorldCookie(store.get(MC_WORLD_COOKIE)?.value);
}

export async function persistSelectedMinecraftWorld(
  serverId: MinecraftServerId,
): Promise<void> {
  const store = await cookies();
  store.set(MC_WORLD_COOKIE, serverId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
