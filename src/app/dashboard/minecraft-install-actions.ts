"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  assignMinecraftInstall,
  clearMinecraftServerConnection,
  deleteMinecraftInstall,
} from "@/lib/minecraft-installs-db";
import {
  parseMinecraftInstallId,
  parseMinecraftServerId,
} from "@/lib/minecraft-server";

export async function assignMinecraftInstallAction(
  installId: string,
  serverId: string,
) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const id = parseMinecraftInstallId(installId);
  const world = parseMinecraftServerId(serverId);
  if (!id || !world) return { error: "Datos inválidos" };
  try {
    await assignMinecraftInstall(id, world);
  } catch (e) {
    if (e instanceof Error && e.message === "INSTALL_NOT_FOUND") {
      return { error: "Ese dedicated ya no aparece. Esperá un ping." };
    }
    throw e;
  }
  revalidatePath("/dashboard/ajustes");
  return { ok: true as const };
}

export async function clearMinecraftServerConnectionAction(serverId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const world = parseMinecraftServerId(serverId);
  if (!world) return { error: "Datos inválidos" };
  await clearMinecraftServerConnection(world);
  revalidatePath("/dashboard/ajustes");
  return { ok: true as const };
}

export async function deleteMinecraftInstallAction(installId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autorizado" };
  const id = parseMinecraftInstallId(installId);
  if (!id) return { error: "Datos inválidos" };
  const deleted = await deleteMinecraftInstall(id);
  if (!deleted) {
    return { error: "Ese dedicated ya no aparece." };
  }
  revalidatePath("/dashboard/ajustes");
  return { ok: true as const };
}
