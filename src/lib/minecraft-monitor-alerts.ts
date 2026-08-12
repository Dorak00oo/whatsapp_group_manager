import {
  buildVandalismAlerts,
  gamertagKey,
  isMonitorAlertCriticalType,
  mergeAlertCounts,
  MONITOR_ALERT_WINDOW_MS,
  monitorAlertExpiresAt,
  parseAlertCountsJson,
  tallyCriticalAlertTypes,
  type MonitorAlertCounts,
} from "@/lib/minecraft-monitor";
import { prisma } from "@/lib/prisma";

export type MonitorAlertEventInput = {
  gamertag: string;
  eventType: string;
  occurredAt: Date;
  blockType?: string | null;
  itemType?: string | null;
};

export type { MonitorAlertCounts };

export type MonitorAlertRow = {
  id: string;
  gamertag: string;
  eventCount: number;
  witherCount: number;
  counts: MonitorAlertCounts;
  windowStart: string;
  lastEventAt: string;
  expiresAt: string;
};

const CRITICAL_EVENT_TYPES = [
  "fire_start",
  "lava_place",
  "tnt_place",
  "tnt_ignite",
  "block_burn",
  "wither_summon",
  "animal_kill",
] as const;

/**
 * Tras guardar un lote: abre o incrementa alertas (una abierta por jugador).
 * - Wither: abre/suma siempre (prioridad máxima).
 * - Cluster ≥3 críticos / 10 min: abre si no había alerta.
 * - Si ya hay alerta abierta: suma los críticos del lote (sin duplicar tarjetas).
 */
export async function applyMonitorAlertsFromEvents(
  events: MonitorAlertEventInput[],
): Promise<void> {
  const critical = events
    .filter((e) => isMonitorAlertCriticalType(e.eventType))
    .map((e) => ({
      gamertag: e.gamertag.trim(),
      eventType: e.eventType,
      occurredAt: e.occurredAt,
      blockType: e.blockType ?? null,
      itemType: e.itemType ?? null,
    }))
    .filter((e) => e.gamertag.length > 0);

  if (critical.length === 0) return;

  const byPlayer = new Map<
    string,
    { display: string; events: MonitorAlertEventInput[] }
  >();
  for (const e of critical) {
    const key = gamertagKey(e.gamertag);
    const bucket = byPlayer.get(key);
    if (bucket) bucket.events.push(e);
    else byPlayer.set(key, { display: e.gamertag, events: [e] });
  }

  const now = new Date();

  for (const [key, { display, events: playerEvents }] of byPlayer) {
    playerEvents.sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    const batchCritical = playerEvents.length;
    const batchWithers = playerEvents.filter(
      (e) => e.eventType === "wither_summon",
    ).length;
    const batchCounts = tallyCriticalAlertTypes(playerEvents);
    const batchFirst = playerEvents[0]!.occurredAt;
    const batchLast = playerEvents[playerEvents.length - 1]!.occurredAt;

    const open = await prisma.minecraftMonitorAlert.findFirst({
      where: {
        gamertagKey: key,
        dismissedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastEventAt: "desc" },
    });

    if (open) {
      const merged = mergeAlertCounts(
        parseAlertCountsJson(open.countsJson),
        batchCounts,
      );
      await prisma.minecraftMonitorAlert.update({
        where: { id: open.id },
        data: {
          gamertag: display,
          eventCount: open.eventCount + batchCritical,
          witherCount: open.witherCount + batchWithers,
          countsJson: JSON.stringify(merged),
          lastEventAt:
            batchLast > open.lastEventAt ? batchLast : open.lastEventAt,
          expiresAt: monitorAlertExpiresAt(now),
        },
      });
      continue;
    }

    const hasWither = batchWithers > 0;
    let shouldOpen = hasWither;
    let initialCount = batchCritical;
    let initialCounts = batchCounts;
    let windowStart = batchFirst;

    if (!shouldOpen) {
      const lookback = new Date(now.getTime() - MONITOR_ALERT_WINDOW_MS);
      const recent = await prisma.minecraftMonitorEvent.findMany({
        where: {
          gamertag: { equals: display, mode: "insensitive" },
          eventType: { in: [...CRITICAL_EVENT_TYPES] },
          occurredAt: { gte: lookback },
        },
        select: {
          gamertag: true,
          eventType: true,
          occurredAt: true,
          blockType: true,
          itemType: true,
        },
        take: 200,
      });
      const computed = buildVandalismAlerts(recent);
      const hit = computed.find((a) => gamertagKey(a.gamertag) === key);
      if (hit) {
        shouldOpen = true;
        initialCount = Math.max(hit.count, batchCritical);
        windowStart = new Date(hit.windowStart);
        const windowEnd = new Date(hit.windowEnd);
        const inWindow = recent.filter((e) => {
          const t = e.occurredAt.getTime();
          return t >= windowStart.getTime() && t <= windowEnd.getTime();
        });
        initialCounts = tallyCriticalAlertTypes(
          inWindow.length > 0 ? inWindow : playerEvents,
        );
      }
    }

    if (!shouldOpen) continue;

    await prisma.minecraftMonitorAlert.create({
      data: {
        gamertag: display,
        gamertagKey: key,
        eventCount: initialCount,
        witherCount: initialCounts.wither_summon ?? batchWithers,
        countsJson: JSON.stringify(initialCounts),
        windowStart,
        lastEventAt: batchLast,
        expiresAt: monitorAlertExpiresAt(now),
      },
    });
  }
}

export async function listActiveMonitorAlerts(): Promise<MonitorAlertRow[]> {
  const now = new Date();
  await prisma.minecraftMonitorAlert.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now }, dismissedAt: null },
        {
          dismissedAt: {
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
  });

  const rows = await prisma.minecraftMonitorAlert.findMany({
    where: {
      dismissedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: [{ lastEventAt: "desc" }],
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    gamertag: r.gamertag,
    eventCount: r.eventCount,
    witherCount: r.witherCount,
    counts: parseAlertCountsJson(r.countsJson),
    windowStart: r.windowStart.toISOString(),
    lastEventAt: r.lastEventAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));
}

export async function dismissMonitorAlert(id: string): Promise<boolean> {
  const row = await prisma.minecraftMonitorAlert.findUnique({ where: { id } });
  if (!row || row.dismissedAt) return false;
  await prisma.minecraftMonitorAlert.update({
    where: { id },
    data: { dismissedAt: new Date() },
  });
  return true;
}
