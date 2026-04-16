"use client";

import { useState } from "react";

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
  activePlayers: number;
  inactivePlayers: number;
  blacklisted: number;
  whitelisted: number;
};

type FilterType = "all" | "active" | "inactive" | "blacklisted" | "whitelisted";

export function MinecraftPlayersSection({
  players,
  activePlayers,
  inactivePlayers,
  blacklisted,
  whitelisted,
}: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const filtered = players.filter((p) => {
    const matchesSearch = p.gamertag
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case "active":
        return p.active;
      case "inactive":
        return !p.active;
      case "blacklisted":
        return p.isBlacklisted;
      case "whitelisted":
        return p.isWhitelisted;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={players.length}
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
          <FilterButton
            active={filter === "blacklisted"}
            onClick={() => setFilter("blacklisted")}
            count={blacklisted}
            variant="danger"
          >
            Blacklist
          </FilterButton>
          <FilterButton
            active={filter === "whitelisted"}
            onClick={() => setFilter("whitelisted")}
            count={whitelisted}
            variant="info"
          >
            Whitelist
          </FilterButton>
        </div>

        <input
          type="text"
          placeholder="Buscar gamertag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    {search
                      ? "No se encontraron jugadores con ese gamertag"
                      : "No hay jugadores registrados"}
                  </td>
                </tr>
              ) : (
                filtered.map((player) => (
                  <tr
                    key={player.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {player.gamertag}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          player.active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {player.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(player.lastSeen).toLocaleString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {player.daysInactive === 0
                        ? "Hoy"
                        : `${player.daysInactive} día${player.daysInactive !== 1 ? "s" : ""}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500">
              Mostrando {filtered.length} de {players.length} jugador
              {players.length !== 1 ? "es" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  variant = "default",
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant?: "default" | "success" | "warning" | "danger" | "info";
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
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${variants[variant]}`}
    >
      {children} <span className="ml-1 opacity-75">({count})</span>
    </button>
  );
}
