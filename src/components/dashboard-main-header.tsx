"use client";

import { usePathname } from "next/navigation";

/**
 * Título principal del panel (columna central), según la ruta.
 */
export function DashboardMainHeader() {
  const pathname = usePathname();
  const isBot = pathname.startsWith("/dashboard/bot");

  return (
    <header className="mb-5 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 max-md:hidden sm:mb-6 sm:pb-6 md:mb-8 xl:mb-8 xl:border-0 xl:pb-0">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl md:text-4xl">
        {isBot ? "Bot WhatsApp" : "Panel"}
      </h1>
      <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {isBot
          ? "Logs, QR o código de emparejamiento y parámetros JSON del bot en Fly (vía API segura en el servidor)."
          : "Registros WhatsApp y Minecraft: personas, filtros, importación y log de inactivos."}
      </p>
    </header>
  );
}
