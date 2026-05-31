import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftRemoteCommandsPanel } from "@/components/minecraft-remote-commands-panel";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

export default async function DashboardComandosPage() {
  const session = await auth();
  if (!session?.user) return null;

  let admins: { id: string; gamertag: string; displayName: string | null }[];

  try {
    admins = await prisma.directoryMember.findMany({
      where: { isAdmin: true },
      orderBy: { gamertag: "asc" },
      select: { id: true, gamertag: true, displayName: true },
    });
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
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
      <MinecraftRemoteCommandsPanel admins={admins} />
    </section>
  );
}
