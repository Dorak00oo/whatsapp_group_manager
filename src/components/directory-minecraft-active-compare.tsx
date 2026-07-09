import type { ActiveCompareData } from "@/lib/directory-minecraft-compare";
import { softPanel } from "@/lib/soft-ui";

type Props = {
  data: ActiveCompareData;
  snapshotAt: string | null;
};

function CompareColumn({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: { id: string; gamertag: string; label: string; detail?: string | null }[];
  emptyText: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <ol
        className="max-h-[min(28rem,55vh)] min-h-[12rem] flex-1 list-decimal overflow-y-auto rounded-2xl bg-zinc-50/80 px-3 py-2 pl-8 text-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900/50 dark:ring-zinc-800/80"
        aria-label={title}
      >
        {rows.length === 0 ? (
          <li className="list-none py-2 text-zinc-500 dark:text-zinc-400">
            {emptyText}
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="border-b border-zinc-200/60 py-1.5 last:border-0 dark:border-zinc-800/60"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {row.label}
              </span>
              {row.detail ? (
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {row.detail}
                </span>
              ) : null}
            </li>
          ))
        )}
      </ol>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {rows.length} en total
      </p>
    </div>
  );
}

export function DirectoryMinecraftActiveCompare({ data, snapshotAt }: Props) {
  const { whatsapp, minecraft, summary } = data;
  const suspects = summary.mcActiveNotInWhatsappActive;

  return (
    <div className={`${softPanel} gap-5`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Reconciliación
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Comparar activos (orden alfabético)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Lista del grupo de WhatsApp frente a jugadores activos en Minecraft.
          Útil para detectar quién entra al servidor sin estar activo en el
          grupo. Coincidencia por gamertag (sin distinguir mayúsculas).
          {snapshotAt ? (
            <> Datos MC del último reporte: {snapshotAt}.</>
          ) : (
            " Sin snapshot reciente: MC usa solo la tabla local."
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
          WA activos: {summary.whatsappCount}
        </span>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
          MC activos: {summary.minecraftCount}
        </span>
        {suspects.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
            Revisar en MC sin WA activo: {suspects.length}
          </span>
        ) : null}
      </div>

      {suspects.length > 0 ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
            Activos en Minecraft que no coinciden con un activo del grupo
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suspects.map((row) => (
              <li
                key={row.id}
                className="rounded-lg bg-white/80 px-2 py-1 text-xs text-amber-950 ring-1 ring-amber-200/80 dark:bg-zinc-900/80 dark:text-amber-50 dark:ring-amber-800/60"
                title={row.detail ?? undefined}
              >
                <span className="font-medium">{row.gamertag}</span>
                {row.detail ? (
                  <span className="text-amber-800/80 dark:text-amber-200/80">
                    {" "}
                    — {row.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <CompareColumn
          title="WhatsApp (activos)"
          subtitle="En el directorio, sin salida y marcados activos"
          rows={whatsapp}
          emptyText="No hay miembros activos en el directorio."
        />
        <CompareColumn
          title="Minecraft (activos)"
          subtitle="Activos según último reporte (no en lista negra)"
          rows={minecraft}
          emptyText="No hay jugadores activos en Minecraft."
        />
      </div>
    </div>
  );
}
