import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftRemoteCommandsPanel } from "@/components/minecraft-remote-commands-panel";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import {
  MINECRAFT_SERVER_DEFAULTS,
  parseMinecraftServerId,
} from "@/lib/minecraft-server";
import { getSelectedMinecraftServerId } from "@/lib/minecraft-selected-world";
import { listMinecraftServers } from "@/lib/minecraft-servers-db";
import { requirePanelSession } from "@/lib/panel-session";

export default async function DashboardComandosPage() {
  const panel = await requirePanelSession();
  const session = await auth();
  if (!session?.user) return null;

  const serverId = await getSelectedMinecraftServerId();
  let worldName = MINECRAFT_SERVER_DEFAULTS[serverId].name;

  try {
    const servers = await listMinecraftServers();
    const row = servers.find((server) => parseMinecraftServerId(server.id) === serverId);
    if (row?.name.trim()) worldName = row.name.trim();
  } catch (error) {
    if (isDatabaseUnreachableError(error)) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Comandos rápidos
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Envía órdenes al mundo de Minecraft Bedrock vía el addon PlayerStatus.
        </p>
      </div>
      <MinecraftRemoteCommandsPanel
        key={serverId}
        defaultOriginGamertag={panel.gamertag}
        worldName={worldName}
      />
    </section>
  );
}
