"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MobileListItem,
  ResponsiveDataList,
} from "@/components/responsive-data-list";
import { StrokeSyncIcon } from "@/components/stroke-sync-icon";

function Glyph({
  children,
  className = "size-3.5 shrink-0",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconBan() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </Glyph>
  );
}

function IconCheck() {
  return (
    <Glyph>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}

function IconStar() {
  return (
    <Glyph>
      <path d="M12 3 9.5 8.5 3.5 9.5 8 13.5 7 19.5 12 16.5 17 19.5 16 13.5 20.5 9.5 14.5 8.5z" />
    </Glyph>
  );
}

function IconX() {
  return (
    <Glyph>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  );
}

/** Refresco del panel: intervalo alto para reducir consultas Neon (CU-h) cuando la pestaña está abierta mucho tiempo. */
const DASHBOARD_REFRESH_MS = 60_000;

type MinecraftPlayer = {
  id: string;
  gamertag: string;
  lastSeen: string;
  active: boolean;
  daysInactive: number;
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  createdAt: string;
};

type Props = {
  players: MinecraftPlayer[];
  blacklistPlayers: MinecraftPlayer[];
  whitelistPlayers: MinecraftPlayer[];
  activePlayers: number;
  inactivePlayers: number;
  summary: {
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
    lastUpdate: { mexico: string; colombia: string } | null;
  } | null;
};

type FilterType = "all" | "active" | "inactive";
type PageTab = "players" | "lists";

function compareMinecraftPlayers(
  a: MinecraftPlayer,
  b: MinecraftPlayer,
  filter: FilterType,
): number {
  const lastSeenMs = (p: MinecraftPlayer) =>
    new Date(p.lastSeen).getTime();

  if (filter === "all") {
    if (a.active !== b.active) return a.active ? -1 : 1;
  }
  return lastSeenMs(b) - lastSeenMs(a);
}

export function MinecraftPlayersSection({
  players,
  blacklistPlayers,
  whitelistPlayers,
  activePlayers,
  inactivePlayers,
  summary,
}: Props) {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      router.refresh();
    };
    const startIfVisible = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (id !== undefined) return;
      id = setInterval(refresh, DASHBOARD_REFRESH_MS);
    };
    const stop = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    };
    const onVis = () => {
      stop();
      if (document.visibilityState === "visible") {
        refresh();
        startIfVisible();
      }
    };
    startIfVisible();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [pageTab, setPageTab] = useState<PageTab>("players");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlayerAction = async (
    gamertag: string,
    action: "blacklist" | "whitelist" | "remove_blacklist" | "remove_whitelist"
  ) => {
    setLoading(gamertag);
    try {
      const res = await fetch("/api/minecraft/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gamertag, action }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al actualizar jugador");
    } finally {
      setLoading(null);
    }
  };

  const requestPanelCommand = async (
    command: string,
    loadingKey: string,
    doneMessage: string,
  ) => {
    setLoading(loadingKey);
    try {
      const res = await fetch("/api/minecraft/sync-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error}`);
        return;
      }

      alert(doneMessage);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al enviar la solicitud al servidor");
    } finally {
      setLoading(null);
    }
  };

  const handleSyncLists = () =>
    requestPanelCommand(
      "synclists",
      "synclists",
      "Sincronizar listas solicitado. El addon lo aplicará en la próxima revisión (~30 s).",
    );

  const searchNeedle = search.trim().toLowerCase();
  const filtered = players
    .filter((p) => {
      const matchesSearch = p.gamertag.toLowerCase().includes(searchNeedle);

      if (!matchesSearch) return false;

      switch (filter) {
        case "active":
          return p.active;
        case "inactive":
          return !p.active;
        default:
          return true;
      }
    })
    .sort((a, b) => compareMinecraftPlayers(a, b, filter));

  const visibleWhitelist = whitelistPlayers.filter((p) =>
    p.gamertag.toLowerCase().includes(searchNeedle),
  );
  const visibleBlacklist = blacklistPlayers.filter((p) =>
    p.gamertag.toLowerCase().includes(searchNeedle),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${summary ? "mb-2" : ""}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Resumen del servidor
            </h3>
            <div
              role="tablist"
              aria-label="Vistas de jugadores"
              className="flex flex-wrap gap-2"
            >
              <TabButton
                active={pageTab === "players"}
                onClick={() => setPageTab("players")}
                count={players.length}
                variant="success"
              >
                Jugadores
              </TabButton>
              <TabButton
                active={pageTab === "lists"}
                onClick={() => setPageTab("lists")}
                count={whitelistPlayers.length + blacklistPlayers.length}
                variant="accent"
              >
                Listas
              </TabButton>
            </div>
          </div>
          {summary?.lastUpdate && (
            <div className="max-w-[min(100%,20rem)] text-right text-xs leading-relaxed text-zinc-500">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                Última actualización
              </p>
              <p>
                <span className="text-zinc-400 dark:text-zinc-500">
                  México:{" "}
                </span>
                {summary.lastUpdate.mexico}
              </p>
              <p>
                <span className="text-zinc-400 dark:text-zinc-500">
                  Colombia:{" "}
                </span>
                {summary.lastUpdate.colombia}
              </p>
            </div>
          )}
        </div>
        {summary && (
          <>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Mismos totales que el addon en su último envío. La pestaña
              Jugadores lista solo ese roster; Listas muestra toda la blacklist
              y whitelist de la base.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Total (último reporte)</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.total}
                </p>
              </div>
              <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
                <p className="text-xs text-green-700 dark:text-green-400">
                  Activos
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-50">
                  {summary.active}
                </p>
              </div>
              <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Inactivos
                </p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                  {summary.inactive}
                </p>
              </div>
              <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
                <p className="text-xs text-red-700 dark:text-red-400">
                  Blacklist
                </p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-50">
                  {summary.blacklisted}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {pageTab === "lists" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncLists}
              disabled={loading === "synclists"}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <StrokeSyncIcon />
              {loading === "synclists" ? "Solicitando..." : "Sincronizar listas"}
            </button>
          </div>
        ) : (
          <div />
        )}
        <input
          type="text"
          placeholder="Buscar gamertag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400"
        />
      </div>

      {pageTab === "players" ? (
        <div role="tabpanel" id="minecraft-players-panel" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
              count={players.length}
              title="Jugadores del último reporte del servidor"
            >
              Todos
            </FilterButton>
            <FilterButton
              active={filter === "active"}
              onClick={() => setFilter("active")}
              count={activePlayers}
              variant="success"
            >
              Activos
            </FilterButton>
            <FilterButton
              active={filter === "inactive"}
              onClick={() => setFilter("inactive")}
              count={inactivePlayers}
              variant="warning"
            >
              Inactivos
            </FilterButton>
          </div>

          <PlayersRosterTable
            players={filtered}
            total={players.length}
            search={search}
            loading={loading}
            onAction={handlePlayerAction}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="minecraft-lists-panel"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <AccessListPanel
            title="Whitelist"
            emptyLabel="No hay jugadores en whitelist"
            players={visibleWhitelist}
            total={whitelistPlayers.length}
            search={search}
            variant="whitelist"
            loading={loading}
            onAction={handlePlayerAction}
          />
          <AccessListPanel
            title="Blacklist"
            emptyLabel="No hay jugadores en blacklist"
            players={visibleBlacklist}
            total={blacklistPlayers.length}
            search={search}
            variant="blacklist"
            loading={loading}
            onAction={handlePlayerAction}
          />
        </div>
      )}
    </div>
  );
}

type PlayerAction =
  | "blacklist"
  | "whitelist"
  | "remove_blacklist"
  | "remove_whitelist";

function formatLastSeen(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDaysInactive(days: number) {
  return days === 0
    ? "Hoy"
    : `${days} día${days !== 1 ? "s" : ""}`;
}

function TabButton({
  active,
  onClick,
  count,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant: "success" | "accent";
  children: React.ReactNode;
}) {
  const variants = {
    success: active
      ? "bg-green-600 text-white shadow-sm"
      : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800",
    accent: active
      ? "bg-violet-600 text-white shadow-sm"
      : "bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:hover:bg-violet-800",
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${variants[variant]}`}
    >
      {children} <span className="ml-1 opacity-75">({count})</span>
    </button>
  );
}

function PlayersRosterTable({
  players,
  total,
  search,
  loading,
  onAction,
}: {
  players: MinecraftPlayer[];
  total: number;
  search: string;
  loading: string | null;
  onAction: (gamertag: string, action: PlayerAction) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <ResponsiveDataList
        isEmpty={players.length === 0}
        empty={
          search
            ? "No se encontraron jugadores con ese gamertag"
            : "No hay jugadores registrados"
        }
        table={
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Gamertag
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Última conexión
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Días inactivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Listas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {players.map((player) => (
                <tr
                  key={player.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {player.gamertag}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={player.active} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatLastSeen(player.lastSeen)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDaysInactive(player.daysInactive)}
                  </td>
                  <td className="px-4 py-3">
                    <ListBadges player={player} />
                  </td>
                  <td className="px-4 py-3">
                    <PlayerListActions
                      player={player}
                      loading={loading}
                      onAction={onAction}
                      compact
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={players.map((player) => (
          <MobileListItem key={player.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {player.gamertag}
              </p>
              <StatusBadge active={player.active} />
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatLastSeen(player.lastSeen)}
              {" · "}
              {formatDaysInactive(player.daysInactive)}
            </p>
            <div className="mt-2">
              <ListBadges player={player} />
            </div>
            <div className="mt-3">
              <PlayerListActions
                player={player}
                loading={loading}
                onAction={onAction}
              />
            </div>
          </MobileListItem>
        ))}
      />

      {players.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500">
            Mostrando {players.length} de {total} jugador
            {total !== 1 ? "es" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function AccessListPanel({
  title,
  emptyLabel,
  players,
  total,
  search,
  variant,
  loading,
  onAction,
}: {
  title: string;
  emptyLabel: string;
  players: MinecraftPlayer[];
  total: number;
  search: string;
  variant: "whitelist" | "blacklist";
  loading: string | null;
  onAction: (gamertag: string, action: PlayerAction) => void;
}) {
  const headerClass =
    variant === "whitelist"
      ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
      : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`border-b px-4 py-3 ${headerClass}`}>
        <h3 className="text-sm font-semibold">
          {title}{" "}
          <span className="font-normal opacity-75">({total})</span>
        </h3>
      </div>
      <ResponsiveDataList
        isEmpty={players.length === 0}
        empty={
          search.trim()
            ? "No se encontraron jugadores con ese gamertag"
            : emptyLabel
        }
        table={
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Gamertag
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Última conexión
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {players.map((player) => (
                <tr
                  key={`${variant}:${player.id}`}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {player.gamertag}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={player.active} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatLastSeen(player.lastSeen)}
                  </td>
                  <td className="px-4 py-3">
                    {variant === "whitelist" ? (
                      <button
                        onClick={() =>
                          onAction(player.gamertag, "remove_whitelist")
                        }
                        disabled={loading === player.gamertag}
                        className="rounded bg-zinc-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                        title="Quitar de whitelist"
                      >
                        <span className="inline-flex items-center gap-1">
                          <IconX /> Quitar WL
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          onAction(player.gamertag, "remove_blacklist")
                        }
                        disabled={loading === player.gamertag}
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        title="Quitar de blacklist"
                      >
                        <span className="inline-flex items-center gap-1">
                          <IconCheck /> Quitar ban
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={players.map((player) => (
          <MobileListItem key={`${variant}:${player.id}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {player.gamertag}
              </p>
              <StatusBadge active={player.active} />
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {formatLastSeen(player.lastSeen)}
            </p>
            <div className="mt-3">
              {variant === "whitelist" ? (
                <button
                  onClick={() => onAction(player.gamertag, "remove_whitelist")}
                  disabled={loading === player.gamertag}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-600 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  title="Quitar de whitelist"
                >
                  <IconX /> Quitar WL
                </button>
              ) : (
                <button
                  onClick={() => onAction(player.gamertag, "remove_blacklist")}
                  disabled={loading === player.gamertag}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  title="Quitar de blacklist"
                >
                  <IconCheck /> Quitar ban
                </button>
              )}
            </div>
          </MobileListItem>
        ))}
      />
      {players.length > 0 && search.trim() && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-500">
            Mostrando {players.length} de {total}
          </p>
        </div>
      )}
    </section>
  );
}

function ListBadges({ player }: { player: MinecraftPlayer }) {
  if (!player.isBlacklisted && !player.isWhitelisted) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {player.isBlacklisted && (
        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
          Blacklist
        </span>
      )}
      {player.isWhitelisted && (
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Whitelist
        </span>
      )}
    </div>
  );
}

function PlayerListActions({
  player,
  loading,
  onAction,
  compact = false,
}: {
  player: MinecraftPlayer;
  loading: string | null;
  onAction: (gamertag: string, action: PlayerAction) => void;
  compact?: boolean;
}) {
  const btn = compact
    ? "rounded px-2 py-1 text-xs font-medium text-white transition-colors disabled:opacity-50"
    : "flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium text-white transition-colors disabled:opacity-50";

  return (
    <div className={compact ? "flex gap-1" : "flex gap-2"}>
      {!player.isBlacklisted ? (
        <button
          onClick={() => onAction(player.gamertag, "blacklist")}
          disabled={loading === player.gamertag}
          className={`${btn} inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700`}
          title="Agregar a blacklist"
        >
          <IconBan /> Ban
        </button>
      ) : (
        <button
          onClick={() => onAction(player.gamertag, "remove_blacklist")}
          disabled={loading === player.gamertag}
          className={`${btn} inline-flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700`}
          title="Quitar de blacklist"
        >
          <IconCheck /> Quitar ban
        </button>
      )}
      {!player.isWhitelisted ? (
        <button
          onClick={() => onAction(player.gamertag, "whitelist")}
          disabled={loading === player.gamertag}
          className={`${btn} inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700`}
          title="Agregar a whitelist"
        >
          <IconStar /> WL
        </button>
      ) : (
        <button
          onClick={() => onAction(player.gamertag, "remove_whitelist")}
          disabled={loading === player.gamertag}
          className={`${btn} inline-flex items-center justify-center gap-1 bg-zinc-600 hover:bg-zinc-700`}
          title="Quitar de whitelist"
        >
          <IconX /> Quitar WL
        </button>
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        active
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  variant = "default",
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  title?: string;
  children: React.ReactNode;
}) {
  const variants = {
    default: active
      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
    success: active
      ? "bg-green-600 text-white"
      : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800",
    warning: active
      ? "bg-amber-600 text-white"
      : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800",
    danger: active
      ? "bg-red-600 text-white"
      : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800",
    info: active
      ? "bg-blue-600 text-white"
      : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${variants[variant]}`}
    >
      {children} <span className="ml-1 opacity-75">({count})</span>
    </button>
  );
}
