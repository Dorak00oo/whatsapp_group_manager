"use server";

import { revalidatePath } from "next/cache";
import { parseMinecraftServerId } from "@/lib/minecraft-server";
import { persistSelectedMinecraftWorld } from "@/lib/minecraft-world";

export async function setSelectedMinecraftWorld(id: string) {
  const parsed = parseMinecraftServerId(id);
  if (!parsed) return { error: "Mundo inválido" };
  await persistSelectedMinecraftWorld(parsed);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/minecraft");
  revalidatePath("/dashboard/parcela");
  revalidatePath("/dashboard/monitoreo");
  revalidatePath("/dashboard/comandos");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/administracion");
  return { ok: true as const, serverId: parsed };
}
