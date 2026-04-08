/**
 * Título principal del panel (columna central), estilo referencia soft-dashboard.
 */
export function DashboardMainHeader() {
  return (
    <header className="mb-6 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 md:mb-8 xl:mb-8 xl:border-0 xl:pb-0">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        Panel
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Registros WhatsApp y Minecraft: personas, filtros, importación y log
        de inactivos.
      </p>
    </header>
  );
}
