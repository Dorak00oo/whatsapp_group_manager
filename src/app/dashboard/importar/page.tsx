import Link from "next/link";
import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { DirectoryBulkUpload } from "@/components/directory-bulk-upload";
import { DirectoryMinecraftActiveCompare } from "@/components/directory-minecraft-active-compare";
import { DirectoryMinecraftInactivePaste } from "@/components/directory-minecraft-inactive-paste";
import { buildActiveCompareData } from "@/lib/directory-minecraft-compare";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  buildRosterFromSnapshot,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

export default async function DashboardImportarPage() {
  const session = await auth();
  if (!session?.user) return null;

  let userId: string | null;
  try {
    userId = await resolveDirectoryUserId(session);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
  if (!userId) return null;

  let compareData;
  let snapshotAt: string | null = null;

  try {
    const [waMembers, mcPlayers, lastSnapshot, config] = await Promise.all([
      prisma.directoryMember.findMany({
        where: { userId },
        select: {
          gamertag: true,
          displayName: true,
          active: true,
          leftAt: true,
        },
      }),
      prisma.minecraftPlayer.findMany({
        orderBy: { lastSeen: "desc" },
      }),
      prisma.minecraftSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
      }),
      prisma.minecraftConfig.findUnique({
        where: { id: "default" },
      }),
    ]);

    const daysInactiveThreshold = config?.daysInactive ?? 7;
    const snapshotByTag = snapshotStatusByGamertag(lastSnapshot?.data);
    const displayPlayers = buildRosterFromSnapshot(
      mcPlayers,
      snapshotByTag,
      daysInactiveThreshold,
    );

    compareData = buildActiveCompareData(waMembers, displayPlayers);
    snapshotAt = lastSnapshot
      ? formatInstantMexicoColombia(lastSnapshot.timestamp).mexico
      : null;
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }

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
          Compara listas, carga masiva desde hoja de cálculo o marca inactivos
          pegando el log del servidor de Minecraft. El alta manual de una sola
          persona sigue en{" "}
          <Link
            href="/dashboard/agregar"
            className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Agregar persona
          </Link>
          .
        </p>
      </div>

      <DirectoryMinecraftActiveCompare
        data={compareData}
        snapshotAt={snapshotAt}
      />

      <div className="border-t border-zinc-200/80 pt-10 dark:border-zinc-700/60">
        <DirectoryBulkUpload />
      </div>

      <div className="border-t border-zinc-200/80 pt-10 dark:border-zinc-700/60">
        <DirectoryMinecraftInactivePaste />
      </div>
    </section>
  );
}
