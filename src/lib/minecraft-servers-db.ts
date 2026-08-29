import { prisma } from "@/lib/prisma";
import { minecraftConfigCreateData } from "@/lib/minecraft-config-defaults";
import {
  MINECRAFT_SERVER_DEFAULTS,
  MINECRAFT_SERVER_IDS,
  parseMinecraftFlavor,
  parseMinecraftServerId,
  type MinecraftServerHeartbeat,
  type MinecraftServerId,
} from "@/lib/minecraft-server";

export async function ensureMinecraftServers(): Promise<void> {
  for (const id of MINECRAFT_SERVER_IDS) {
    const seed = MINECRAFT_SERVER_DEFAULTS[id];
    await prisma.minecraftServer.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: seed.name,
        flavor: seed.flavor,
        edition: seed.edition,
      },
    });
  }
}

export async function touchMinecraftServerHeartbeat(
  serverId: MinecraftServerId,
  meta: MinecraftServerHeartbeat = {},
): Promise<void> {
  await ensureMinecraftServers();
  const flavor = parseMinecraftFlavor(meta.flavor);
  await prisma.minecraftServer.update({
    where: { id: serverId },
    data: {
      lastSeenAt: new Date(),
      ...(flavor ? { flavor } : {}),
      ...(meta.version?.trim()
        ? { lastVersion: meta.version.trim().slice(0, 64) }
        : {}),
      ...(meta.worldName?.trim()
        ? { lastWorldName: meta.worldName.trim().slice(0, 80) }
        : {}),
    },
  });
}

export async function listMinecraftServers() {
  await ensureMinecraftServers();
  return prisma.minecraftServer.findMany({
    orderBy: { id: "asc" },
  });
}

export async function ensureMinecraftConfig(serverId: MinecraftServerId) {
  await ensureMinecraftServers();
  const existing = await prisma.minecraftConfig.findUnique({
    where: { id: serverId },
  });
  if (existing) return existing;
  return prisma.minecraftConfig.create({
    data: minecraftConfigCreateData(serverId),
  });
}

export async function getMinecraftServer(serverId: MinecraftServerId) {
  await ensureMinecraftServers();
  return prisma.minecraftServer.findUniqueOrThrow({ where: { id: serverId } });
}

export function asMinecraftServerId(id: string): MinecraftServerId {
  return parseMinecraftServerId(id) ?? "vanilla";
}
