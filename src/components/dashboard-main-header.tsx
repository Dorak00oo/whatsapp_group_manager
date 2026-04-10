"use client";

import { usePathname } from "next/navigation";

/**
 * Título principal del panel (columna central), según la ruta.
 */
export function DashboardMainHeader() {
  const pathname = usePathname();
  const isBot = pathname.startsWith("/dashboard/bot");

  return (
    <header className="mb-6 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 md:mb-8 xl:mb-8 xl:border-0 xl:pb-0">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        {isBot ? "Bot WhatsApp" : "Panel"}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {isBot
          ? "Logs, QR de emparejamiento y parámetros JSON del bot en Fly (vía API segura en el servidor)."
          : "Registros WhatsApp y Minecraft: personas, filtros, importación y log de inactivos."}
      </p>
    </header>
  );
}
