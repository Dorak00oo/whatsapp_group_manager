import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftMonitorSection } from "@/components/minecraft-monitor-section";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  DEFAULT_MONITOR_EXCLUDE,
  MONITOR_PAGE_SIZE,
  parseExcludeList,
  type MonitorEventType,
} from "@/lib/minecraft-monitor";
import { listActiveMonitorAlerts } from "@/lib/minecraft-monitor-alerts";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

export default async function DashboardMonitoreoPage() {
  const session = await auth();
  if (!session?.user) return null;

  try {
    const [config, events, eventTotal, alerts] = await Promise.all([
      prisma.minecraftConfig.findUnique({ where: { id: "default" } }),
      prisma.minecraftMonitorEvent.findMany({
        orderBy: { occurredAt: "desc" },
        take: MONITOR_PAGE_SIZE,
      }),
      prisma.minecraftMonitorEvent.count(),
      listActiveMonitorAlerts(),
    ]);

    const mapped = events.map((e) => {
      const zones = formatInstantMexicoColombia(e.occurredAt);
      return {
        id: e.id,
        gamertag: e.gamertag,
        event: e.eventType as MonitorEventType,
        occurredAt: e.occurredAt.toISOString(),
        timeMexico: zones.mexico,
        timeColombia: zones.colombia,
        x: e.posX,
        y: e.posY,
        z: e.posZ,
        dimension: e.dimension,
        blockType: e.blockType,
        itemType: e.itemType,
        priority: e.priority,
        fireId: e.fireId,
        relatedFireId: e.relatedFireId,
      };
    });

    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Monitoreo
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Bloques colocados/rotos, fuego, lava, TNT, wither y animales
            domésticos/colección en Overworld. El addon envía lotes cada 30 s (o
            al pedirlos). Historial 7 días. Alertas 5 días (o hasta
            descartarlas).
          </p>
        </div>
        <MinecraftMonitorSection
          events={mapped}
          totalEvents={eventTotal}
          alerts={alerts}
          monitorExclude={
            config
              ? parseExcludeList(config.monitorExcludeJson)
              : [...DEFAULT_MONITOR_EXCLUDE]
          }
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
