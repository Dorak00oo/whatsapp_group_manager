export const MONITOR_RETENTION_DAYS = 21;

export type MonitorEventType =
  | "block_break"
  | "block_place"
  | "fire_start"
  | "lava_place"
  | "tnt_place"
  | "tnt_ignite"
  | "block_burn"
  | "wither_summon";

export type MonitorPriority = "critical" | "high" | "normal";

export const MONITOR_EVENT_TYPES: MonitorEventType[] = [
  "block_break",
  "block_place",
  "fire_start",
  "lava_place",
  "tnt_place",
  "tnt_ignite",
  "block_burn",
  "wither_summon",
];

export function isMonitorEventType(v: string): v is MonitorEventType {
  return (MONITOR_EVENT_TYPES as string[]).includes(v);
}

/** Lista base de ruido (sin prefijo minecraft:). Editable desde el panel. */
export const DEFAULT_MONITOR_EXCLUDE: string[] = [
  "grass_block",
  "dirt",
  "coarse_dirt",
  "rooted_dirt",
  "mud",
  "sand",
  "red_sand",
  "gravel",
  "clay",
  "snow",
  "snow_layer",
  "ice",
  "packed_ice",
  "blue_ice",
  "stone",
  "deepslate",
  "cobblestone",
  "cobbled_deepslate",
  "moss_block",
  "moss_carpet",
  "podzol",
  "mycelium",
  "dirt_path",
  "short_grass",
  "tall_grass",
  "fern",
  "large_fern",
  "dead_bush",
  "oak_leaves",
  "spruce_leaves",
  "birch_leaves",
  "jungle_leaves",
  "acacia_leaves",
  "dark_oak_leaves",
  "mangrove_leaves",
  "cherry_leaves",
  "azalea_leaves",
  "flowering_azalea_leaves",
  "oak_sapling",
  "spruce_sapling",
  "birch_sapling",
  "jungle_sapling",
  "acacia_sapling",
  "dark_oak_sapling",
  "cherry_sapling",
  "wheat",
  "carrots",
  "potatoes",
  "beetroot",
  "melon_stem",
  "pumpkin_stem",
  "sugar_cane",
  "bamboo",
  "kelp",
  "kelp_plant",
  "seagrass",
  "tall_seagrass",
  "dandelion",
  "poppy",
  "blue_orchid",
  "allium",
  "azure_bluet",
  "red_tulip",
  "orange_tulip",
  "white_tulip",
  "pink_tulip",
  "oxeye_daisy",
  "cornflower",
  "lily_of_the_valley",
  "brown_mushroom",
  "red_mushroom",
  "vine",
  "glow_lichen",
  "hanging_roots",
  "torch",
  "soul_torch",
  "lantern",
  "soul_lantern",
  "candle",
  "scaffolding",
  "string",
];

/** Siempre se registran (place/break), aunque estén en exclude. */
export const MONITOR_ALWAYS_LOG: string[] = [
  "diamond_ore",
  "deepslate_diamond_ore",
  "diamond_block",
  "ancient_debris",
  "netherite_block",
  "netherite_scrap",
  "tnt",
];

export function normalizeBlockId(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, "");
}

export function parseExcludeList(json: string | null | undefined): string[] {
  if (!json?.trim()) return [...DEFAULT_MONITOR_EXCLUDE];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_MONITOR_EXCLUDE];
    return arr
      .filter((x): x is string => typeof x === "string")
      .map((x) => normalizeBlockId(x))
      .filter(Boolean);
  } catch {
    return [...DEFAULT_MONITOR_EXCLUDE];
  }
}

export function shouldLogBlockPlaceBreak(
  blockType: string,
  excludeList: string[],
): boolean {
  const id = normalizeBlockId(blockType);
  if (!id) return false;
  if (MONITOR_ALWAYS_LOG.includes(id)) return true;
  if (id.includes("leaves")) return false;
  return !excludeList.includes(id);
}

export function eventLabel(type: MonitorEventType): string {
  switch (type) {
    case "block_break":
      return "Rompió";
    case "block_place":
      return "Colocó";
    case "fire_start":
      return "Encendió fuego";
    case "lava_place":
      return "Colocó lava";
    case "tnt_place":
      return "Colocó TNT";
    case "tnt_ignite":
      return "Encendió TNT";
    case "block_burn":
      return "Quema atribuida";
    case "wither_summon":
      return "Invocó wither";
    default:
      return type;
  }
}

/** Alerta: ≥3 eventos críticos (fuego/TNT/quema/wither) en 10 minutos por jugador. */
export const MONITOR_ALERT_WINDOW_MS = 10 * 60 * 1000;
export const MONITOR_ALERT_MIN_EVENTS = 3;
/** Las alertas del panel duran 7 días (o hasta descartarlas). */
export const MONITOR_ALERT_RETENTION_DAYS = 7;

export const MONITOR_ALERT_CRITICAL_TYPES = new Set([
  "fire_start",
  "lava_place",
  "tnt_place",
  "tnt_ignite",
  "block_burn",
  "wither_summon",
]);

export function isMonitorAlertCriticalType(eventType: string): boolean {
  return MONITOR_ALERT_CRITICAL_TYPES.has(eventType);
}

export function monitorAlertExpiresAt(from = new Date()): Date {
  return new Date(
    from.getTime() + MONITOR_ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function gamertagKey(gamertag: string): string {
  return gamertag.trim().toLowerCase();
}

export function buildVandalismAlerts(
  events: Array<{
    gamertag: string;
    eventType: string;
    occurredAt: string | Date;
  }>,
): Array<{ gamertag: string; count: number; windowStart: string; windowEnd: string }> {
  const critical = MONITOR_ALERT_CRITICAL_TYPES;
  const byPlayer = new Map<string, Date[]>();
  for (const e of events) {
    if (!critical.has(e.eventType)) continue;
    const t = new Date(e.occurredAt);
    if (Number.isNaN(t.getTime())) continue;
    const key = e.gamertag.trim().toLowerCase();
    if (!byPlayer.has(key)) byPlayer.set(key, []);
    byPlayer.get(key)!.push(t);
  }

  const alerts: Array<{
    gamertag: string;
    count: number;
    windowStart: string;
    windowEnd: string;
  }> = [];

  for (const [key, times] of byPlayer) {
    times.sort((a, b) => a.getTime() - b.getTime());
    let best = 0;
    let bestStart = times[0]!;
    let bestEnd = times[0]!;
    let j = 0;
    for (let i = 0; i < times.length; i++) {
      while (times[i]!.getTime() - times[j]!.getTime() > MONITOR_ALERT_WINDOW_MS) j++;
      const count = i - j + 1;
      if (count > best) {
        best = count;
        bestStart = times[j]!;
        bestEnd = times[i]!;
      }
    }
    if (best >= MONITOR_ALERT_MIN_EVENTS) {
      const sample = events.find(
        (e) => e.gamertag.trim().toLowerCase() === key,
      );
      alerts.push({
        gamertag: sample?.gamertag ?? key,
        count: best,
        windowStart: bestStart.toISOString(),
        windowEnd: bestEnd.toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => b.count - a.count);
}
