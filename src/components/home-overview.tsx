import Link from "next/link";
import { MinecraftRemoteCommandsPanel } from "@/components/minecraft-remote-commands-panel";
import type { AuditLinePart } from "@/lib/audit-format";
import type { HomeBotPresentation } from "@/lib/home-bot-status";
import type { MinecraftLinkStatus, MinecraftServerId } from "@/lib/minecraft-server";
import { softPanel } from "@/lib/soft-ui";

export type HomeCounts = {
  active: number;
  inactive: number;
  newer: number;
  absent: number;
  protected: number;
  left: number;
};

export type HomeWorld = {
  id: MinecraftServerId;
  name: string;
  selected: boolean;
  linkStatus: MinecraftLinkStatus;
  linkLabel: string;
  /** `unknown` = no hay roster fresco; `empty` = fresco y nadie; `online` = hay jugadores. */
  playersState: "unknown" | "empty" | "online";
  players: string[];
};

export type HomeJoiner = {
  id: string;
  gamertag: string;
  detail: string;
  timeLabel: string;
};

export type HomeAlert = {
  id: string;
  worldName: string;
  gamertag: string;
  summary: string;
  timeLabel: string;
};

export type HomeAuditItem = {
  id: string;
  iso: string;
  timeLabel: string;
  memberId: string | null;
  parts: AuditLinePart[];
};

type Props = {
  counts: HomeCounts;
  bot: HomeBotPresentation;
  worlds: HomeWorld[];
  newest: HomeJoiner[];
  alerts: HomeAlert[];
  alertTotal: number;
  alertsUnknown: boolean;
  events: HomeAuditItem[];
  originGamertag: string;
  commandWorldName: string;
  commandWorldId: MinecraftServerId;
};

const countTile =
  "flex min-h-[4.5rem] flex-col justify-center rounded-2xl px-3 py-2.5 ring-1 transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-zinc-100";

const tiles: {
  key: keyof HomeCounts;
  href: string;
  label: string;
  className: string;
}[] = [
  {
    key: "active",
    href: "/dashboard/lista?cohort=roster",
    label: "Activos",
    className:
      "bg-emerald-200 text-emerald-950 ring-emerald-400/50 hover:bg-emerald-300 dark:bg-emerald-950/55 dark:text-emerald-50 dark:ring-emerald-700/50 dark:hover:bg-emerald-900/70",
  },
  {
    key: "inactive",
    href: "/dashboard/lista?cohort=inactive",
    label: "Inactivos",
    className:
      "bg-zinc-200 text-zinc-900 ring-zinc-300/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700",
  },
  {
    key: "newer",
    href: "/dashboard/lista?cohort=new",
    label: "Nuevos",
    className:
      "bg-lime-200 text-lime-950 ring-lime-300/70 hover:bg-lime-300 dark:bg-lime-950/50 dark:text-lime-50 dark:ring-lime-800/50 dark:hover:bg-lime-900/60",
  },
  {
    key: "absent",
    href: "/dashboard/lista?cohort=absent",
    label: "Ausentes",
    className:
      "bg-sky-200 text-sky-950 ring-sky-300/70 hover:bg-sky-300 dark:bg-sky-950/50 dark:text-sky-50 dark:ring-sky-800/50 dark:hover:bg-sky-900/60",
  },
  {
    key: "protected",
    href: "/dashboard/lista?cohort=protected",
    label: "Protegidos",
    className:
      "bg-cyan-200 text-cyan-950 ring-cyan-300/70 hover:bg-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-50 dark:ring-cyan-800/50 dark:hover:bg-cyan-900/60",
  },
  {
    key: "left",
    href: "/dashboard/lista?cohort=left",
    label: "Se salieron",
    className:
      "bg-amber-200 text-amber-950 ring-amber-300/70 hover:bg-amber-300 dark:bg-amber-950/45 dark:text-amber-50 dark:ring-amber-800/50 dark:hover:bg-amber-900/55",
  },
];

const linkTone: Record<MinecraftLinkStatus, string> = {
  live: "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-50",
  quiet: "bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-50",
  offline: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  never: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

const botTone: Record<HomeBotPresentation["tone"], string> = {
  connected: linkTone.live,
  waiting: linkTone.quiet,
  offline: linkTone.offline,
  unknown: linkTone.never,
};

const quietLink =
  "font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-700 dark:text-sky-400 dark:decoration-sky-800 dark:hover:decoration-sky-400";

function playerSummary(world: HomeWorld): string {
  if (world.playersState === "unknown") return "Jugadores: sin datos";
  if (world.playersState === "empty") return "Nadie en línea";
  const shown = world.players.slice(0, 8);
  const rest = world.players.length - shown.length;
  const names = rest > 0 ? `${shown.join(", ")} y ${rest} más` : shown.join(", ");
  return `${world.players.length} en línea: ${names}`;
}

function EventLine({ item }: { item: HomeAuditItem }) {
  return (
    <p className="text-pretty text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {item.parts.map((part, index) => {
        if (part.kind === "actor" || part.kind === "member") {
          return (
            <span key={index} className="font-semibold text-zinc-900 dark:text-zinc-50">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </p>
  );
}

export function HomeOverview({
  counts,
  bot,
  worlds,
  newest,
  alerts,
  alertTotal,
  alertsUnknown,
  events,
  originGamertag,
  commandWorldName,
  commandWorldId,
}: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Inicio
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Conteos de la comunidad, estado del bot y de los dos mundos, y
          comandos del mundo que tienes seleccionado.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
        role="region"
        aria-label="Conteos de la comunidad"
      >
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className={`${countTile} ${tile.className}`}
            aria-label={`${tile.label}: ${counts[tile.key]}`}
          >
            <span className="text-xl font-semibold tabular-nums leading-none">
              {counts[tile.key]}
            </span>
            <span className="mt-1 text-xs font-semibold">{tile.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <section className="flex h-full flex-col" aria-labelledby="home-status-heading">
          <h3
            id="home-status-heading"
            className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Estado
          </h3>
          <div className={`${softPanel} h-full`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Bot de WhatsApp
                </p>
                {bot.detail ? (
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {bot.detail}
                  </p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${botTone[bot.tone]}`}
              >
                {bot.label}
              </span>
            </div>
            <ul className="flex flex-col gap-3 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
              {worlds.map((world) => (
                <li key={world.id} className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {world.name}
                      {world.selected ? (
                        <span className="ml-2 text-xs font-medium text-zinc-500">
                          Seleccionado
                        </span>
                      ) : null}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${linkTone[world.linkStatus]}`}
                    >
                      {world.linkLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {playerSummary(world)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              <Link href="/dashboard/bot" className={quietLink}>
                Abrir el bot
              </Link>
              <span className="text-zinc-400"> · </span>
              <Link href="/dashboard/ajustes" className={quietLink}>
                Ajustes de los mundos
              </Link>
            </p>
            <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800/80">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Últimos en el directorio
              </p>
              {newest.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Todavía no hay personas.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {newest.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/dashboard/lista?q=${encodeURIComponent(person.gamertag)}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-100 px-3.5 py-3 ring-1 ring-zinc-200/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80"
                      >
                        <span className="min-w-0 truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {person.gamertag}
                        </span>
                        <span className="shrink-0 text-right text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="block">{person.detail}</span>
                          <span className="block tabular-nums text-zinc-500">{person.timeLabel}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="flex h-full flex-col" aria-labelledby="home-alerts-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3
              id="home-alerts-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Alertas
            </h3>
            <Link href="/dashboard/monitoreo" className={`text-sm ${quietLink}`}>
              Ver monitoreo
            </Link>
          </div>
          <div className={`${softPanel} h-full`}>
            {alertsUnknown ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Sin datos</p>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No hay alertas abiertas.
              </p>
            ) : (
              <>
                {alertTotal > alerts.length ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Hay {alertTotal} abiertas. Estas son las más recientes.
                  </p>
                ) : null}
                <ul className="flex flex-col">
                  {alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="border-t border-zinc-200/80 py-3 first:border-t-0 first:pt-0 last:pb-0 dark:border-zinc-800/80"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <Link
                          href={`/dashboard/lista?q=${encodeURIComponent(alert.gamertag)}`}
                          className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                        >
                          {alert.gamertag}
                        </Link>
                        <time
                          className="shrink-0 text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-400"
                        >
                          {alert.timeLabel}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {alert.summary}
                        <span className="text-zinc-500"> · {alert.worldName}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="home-history-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3
            id="home-history-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Historial
          </h3>
          <Link href="/dashboard/cuentas" className={`text-sm ${quietLink}`}>
            Ver historial
          </Link>
        </div>
        <div className={softPanel}>
          {events.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Todavía no hay cambios registrados.
            </p>
          ) : (
            <ul className="flex flex-col">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="grid gap-1 border-t border-zinc-200/80 py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 dark:border-zinc-800/80"
                >
                  <time
                    dateTime={event.iso}
                    className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400"
                  >
                    {event.timeLabel}
                  </time>
                  <EventLine item={event} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="home-commands-heading">
        <h3
          id="home-commands-heading"
          className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Comandos rápidos
        </h3>
        <MinecraftRemoteCommandsPanel
          key={commandWorldId}
          variant="compact"
          defaultOriginGamertag={originGamertag}
          worldName={commandWorldName}
        />
      </section>
    </section>
  );
}
