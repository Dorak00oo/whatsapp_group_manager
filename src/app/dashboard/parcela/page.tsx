import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftParcelSection } from "@/components/minecraft-parcel-section";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  MINECRAFT_CONFIG_DEFAULTS,
  minecraftConfigToPayload,
} from "@/lib/minecraft-config-defaults";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

export default async function DashboardParcelaPage() {
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

  try {
    const [config, events, members] = await Promise.all([
      prisma.minecraftConfig.findUnique({ where: { id: "default" } }),
      prisma.minecraftParcelEvent.findMany({
        orderBy: { occurredAt: "desc" },
        take: 250,
      }),
      prisma.directoryMember.findMany({
        where: { userId },
        select: {
          gamertag: true,
          displayName: true,
          active: true,
          leftAt: true,
        },
      }),
    ]);

    const payload = config
      ? minecraftConfigToPayload(config)
      : { ...MINECRAFT_CONFIG_DEFAULTS };

    const directoryByTag: Record<
      string,
      {
        gamertag: string;
        displayName: string | null;
        active: boolean;
        leftAt: string | null;
      }
    > = {};
    for (const m of members) {
      directoryByTag[m.gamertag.trim().toLowerCase()] = {
        gamertag: m.gamertag,
        displayName: m.displayName,
        active: m.active,
        leftAt: m.leftAt?.toISOString() ?? null,
      };
    }

    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Parcela
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Registro de quién entra y sale de un terreno pequeño en Minecraft.
          </p>
        </div>
        <MinecraftParcelSection
          parcel={payload.parcel}
          events={events.map((e) => {
            const zones = formatInstantMexicoColombia(e.occurredAt);
            return {
              id: e.id,
              gamertag: e.gamertag,
              event: e.eventType as "enter" | "exit",
              occurredAt: e.occurredAt.toISOString(),
              timeMexico: zones.mexico,
              timeColombia: zones.colombia,
              x: e.posX,
              y: e.posY,
              z: e.posZ,
              dimension: e.dimension,
            };
          })}
          directoryByTag={directoryByTag}
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
