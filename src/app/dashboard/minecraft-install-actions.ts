"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assignMinecraftInstall } from "@/lib/minecraft-installs-db";
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
