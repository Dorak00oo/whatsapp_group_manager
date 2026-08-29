import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftBannedItemsSection } from "@/components/minecraft-banned-items-section";
import { MinecraftServersConnection } from "@/components/minecraft-servers-connection";
import { MinecraftWorldSettingsForm } from "@/components/minecraft-world-settings-form";
import { parseBannedItems } from "@/lib/minecraft-banned-items";
import { getSelectedMinecraftServerId } from "@/lib/minecraft-selected-world";
import {
  ensureMinecraftConfig,
  getMinecraftServer,
  listMinecraftServers,
} from "@/lib/minecraft-servers-db";
import { listMinecraftInstalls } from "@/lib/minecraft-installs-db";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";

export default async function DashboardAjustesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const serverId = await getSelectedMinecraftServerId();

  try {
    const [server, config, servers, installs] = await Promise.all([
      getMinecraftServer(serverId),
      ensureMinecraftConfig(serverId),
      listMinecraftServers(),
      listMinecraftInstalls(),
    ]);

    return (
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Ajustes de {server.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Arriba ves si Vanilla y Mods están hablando con el panel y asignás
            cada dedicated. Abajo se edita el mundo seleccionado. Sync all sigue
            en Jugadores → Listas.
          </p>
        </div>

        <MinecraftServersConnection
          selectedWorld={serverId}
          initialServers={servers.map((s) => ({
            id: s.id,
            name: s.name,
            flavor: s.flavor,
            edition: s.edition,
            lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
            lastVersion: s.lastVersion,
            lastWorldName: s.lastWorldName,
          }))}
          initialInstalls={installs.map((row) => ({
            id: row.id,
            serverId: row.serverId,
            lastWorldName: row.lastWorldName,
            lastVersion: row.lastVersion,
            lastSeenAt: row.lastSeenAt.toISOString(),
            assignedAt: row.assignedAt?.toISOString() ?? null,
          }))}
        />

        <MinecraftWorldSettingsForm
          key={`${serverId}-settings`}
          serverId={serverId}
          initialName={server.name}
          config={{
            daysInactive: config.daysInactive,
            daysBlacklist: config.daysBlacklist,
            daysPurge: config.daysPurge,
            snapshotRetentionDays: config.snapshotRetentionDays,
            snapshotKeepMinimum: config.snapshotKeepMinimum,
          }}
        />

        <MinecraftBannedItemsSection
          key={`${serverId}-banned`}
          initialItems={parseBannedItems(config.bannedItemsJson)}
        />
      </section>
    );
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
}
