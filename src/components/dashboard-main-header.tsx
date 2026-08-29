"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  isMinecraftWorldRoute,
  MinecraftWorldSwitcher,
} from "@/components/minecraft-world-switcher";
import type { MinecraftServerId } from "@/lib/minecraft-server";

type Props = {
  selectedWorld: MinecraftServerId;
  worldNames: Partial<Record<MinecraftServerId, string>>;
};

export function DashboardMainHeader({ selectedWorld, worldNames }: Props) {
  const pathname = usePathname();
  const isComandos = pathname.startsWith("/dashboard/comandos");
  const isMinecraft = pathname.startsWith("/dashboard/minecraft");
  const isParcela = pathname.startsWith("/dashboard/parcela");
  const isMonitoreo = pathname.startsWith("/dashboard/monitoreo");
  const isAdministracion = pathname.startsWith("/dashboard/administracion");
  const isBot = pathname.startsWith("/dashboard/bot");
  const isAjustes = pathname.startsWith("/dashboard/ajustes");

  const title = isBot
    ? "Bot de WhatsApp"
    : isAjustes
      ? "Ajustes de Minecraft"
      : isComandos
        ? "Comandos rápidos"
        : isParcela
          ? "Parcela"
          : isMonitoreo
            ? "Monitoreo"
            : isMinecraft
              ? "Jugadores de Minecraft"
              : isAdministracion
                ? "Administración de los usuarios"
                : "Panel";
  const subtitle = isBot
    ? "QR o código de 8 dígitos para vincular el número, y logs del bot Yuki."
    : isAjustes
      ? "Conexión de Vanilla y Mods, nombre, umbrales e ítems baneados del mundo seleccionado."
      : isComandos
        ? "Órdenes al mundo Bedrock vía el addon (espectador, survival, fuego, limpieza de mobs)."
        : isParcela
          ? "Zonas monitoreadas: entradas, salidas y cofres. Historial 6 meses."
          : isMonitoreo
            ? "Bloques, fuego, lava, TNT y withers en Overworld — filtros por jugador, ítem, hora y coordenadas."
            : isMinecraft
              ? "Estado de actividad de jugadores del servidor de Minecraft."
              : isAdministracion
                ? "Administración de jugadores, allowlist, auditoría de gamertags y comparación con Minecraft."
                : "Directorio de personas, filtros, importación y monitoreo Minecraft.";

  return (
    <header className="mb-5 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 max-md:hidden sm:mb-6 sm:pb-6 md:mb-8 xl:mb-8 xl:border-0 xl:pb-0">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {subtitle}
      </p>
      {isMinecraftWorldRoute(pathname) ? (
        <Suspense fallback={null}>
          <MinecraftWorldSwitcher selected={selectedWorld} names={worldNames} />
        </Suspense>
      ) : null}
    </header>
  );
}
