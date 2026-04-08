import Link from "next/link";
import { DirectoryBulkUpload } from "@/components/directory-bulk-upload";
import { DirectoryMinecraftInactivePaste } from "@/components/directory-minecraft-inactive-paste";

export default function DashboardImportarPage() {
  return (
    <section className="flex flex-col gap-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Herramientas
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Importar y log
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Carga masiva desde hoja de cálculo o marca inactivos pegando el log del
          servidor de Minecraft. El alta manual de una sola persona sigue en{" "}
          <Link
            href="/dashboard/agregar"
            className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Agregar persona
          </Link>
          .
        </p>
      </div>

      <DirectoryBulkUpload />

      <div className="border-t border-zinc-200/80 pt-10 dark:border-zinc-700/60">
        <DirectoryMinecraftInactivePaste />
      </div>
    </section>
  );
}
