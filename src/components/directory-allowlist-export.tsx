import { AllowlistAddNewButton } from "@/components/allowlist-add-new-button";
import { AllowlistCorrectedButton } from "@/components/allowlist-corrected-button";
import { softBtnLavender, softPanel } from "@/lib/soft-ui";

type Props = {
  activeCount: number;
};

export function DirectoryAllowlistExport({ activeCount }: Props) {
  return (
    <div className={`${softPanel} gap-3`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Whitelist del servidor
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Exportar allowlist.json ({activeCount} activo
          {activeCount === 1 ? "" : "s"})
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Descarga la lista de miembros activos en el grupo (sin salida) en el
          formato de allowlist de Minecraft Bedrock. Los botones de sincronizar
          modifican el allowlist real del servidor en vivo (a través del addon,
          usando la API de administración, no el JSON que descargas aquí). Para
          comprobar el resultado en el servidor usa la consola{" "}
          <code className="rounded-lg bg-violet-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-violet-200/90 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800/50">
            allowlist list
          </code>{" "}
          o el{" "}
          <code className="rounded-lg bg-violet-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-violet-200/90 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-800/50">
            allowlist.json
          </code>{" "}
          en la raíz del Bedrock (no una copia antigua subida a mano).
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <a
          href="/dashboard/allowlist"
          download="allowlist.json"
          className={`${softBtnLavender} self-start`}
        >
          Descargar allowlist.json
        </a>
        <AllowlistAddNewButton />
        <AllowlistCorrectedButton />
      </div>
    </div>
  );
}
