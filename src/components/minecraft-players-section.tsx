"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type Config = {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
};

type Props = {
  players: MinecraftPlayer[];
  activePlayers: number;
  inactivePlayers: number;
  blacklisted: number;
  whitelisted: number;
  config: Config;
};

type FilterType = "all" | "active" | "inactive" | "blacklisted" | "whitelisted";

export function MinecraftPlayersSection({
  players,
  activePlayers,
  inactivePlayers,
  blacklisted,
  whitelisted,
  config,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState(config);

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

  const handleConfigSave = async () => {
    setLoading("config");
    try {
      // Aquí necesitarías un endpoint para actualizar config desde el dashboard
      // Por ahora solo mostramos el modal
      alert(
        `Configuración guardada:\n- Días inactivo: ${configForm.daysInactive}\n- Días blacklist: ${configForm.daysBlacklist}\n- Días purga: ${configForm.daysPurge}`
      );
      setShowConfigModal(false);
      // TODO: Implementar guardado en backend
    } finally {
      setLoading(null);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            ⚙️ Configurar días
          </button>
        </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!player.isBlacklisted ? (
                          <button
                            onClick={() =>
                              handlePlayerAction(player.gamertag, "blacklist")
                            }
                            disabled={loading === player.gamertag}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            title="Agregar a blacklist"
                          >
                            🚫 Ban
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handlePlayerAction(
                                player.gamertag,
                                "remove_blacklist"
                              )
                            }
                            disabled={loading === player.gamertag}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                            title="Quitar de blacklist"
                          >
                            ✅ Unban
                          </button>
                        )}
                        {!player.isWhitelisted ? (
                          <button
                            onClick={() =>
                              handlePlayerAction(player.gamertag, "whitelist")
                            }
                            disabled={loading === player.gamertag}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            title="Agregar a whitelist"
                          >
                            ⭐ WL
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handlePlayerAction(
                                player.gamertag,
                                "remove_whitelist"
                              )
                            }
                            disabled={loading === player.gamertag}
                            className="rounded bg-zinc-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                            title="Quitar de whitelist"
                          >
                            ❌ Remove WL
                          </button>
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

      {/* Modal de configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Configurar días del sistema
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Días para considerar inactivo
                </label>
                <input
                  type="number"
                  min="1"
                  value={configForm.daysInactive}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      daysInactive: parseInt(e.target.value) || 7,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Actual: {config.daysInactive} días
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Días para blacklist automática
                </label>
                <input
                  type="number"
                  min="1"
                  value={configForm.daysBlacklist}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      daysBlacklist: parseInt(e.target.value) || 14,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Actual: {config.daysBlacklist} días
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Días para purgar de la lista
                </label>
                <input
                  type="number"
                  min="1"
                  value={configForm.daysPurge}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      daysPurge: parseInt(e.target.value) || 21,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Actual: {config.daysPurge} días
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleConfigSave}
                disabled={loading === "config"}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading === "config" ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigForm(config);
                }}
                className="flex-1 rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
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
