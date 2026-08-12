export const MONITOR_RETENTION_DAYS = 7;

export type MonitorEventType =
  | "block_break"
  | "block_place"
  | "fire_start"
  | "lava_place"
  | "tnt_place"
  | "tnt_ignite"
  | "block_burn"
  | "wither_summon"
  | "animal_kill";

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
  "animal_kill",
];

/** Animales domésticos / colección monitoreados (sin prefijo minecraft:). */
export const MONITOR_PROTECTED_ANIMALS: string[] = [
  "wolf",
  "cat",
  "ocelot",
  "parrot",
  "horse",
  "donkey",
  "mule",
  "llama",
  "camel",
  "panda",
  "fox",
  "axolotl",
  "allay",
  "sniffer",
  "armadillo",
];

export function animalLabel(id: string): string {
  switch (normalizeBlockId(id)) {
    case "wolf":
      return "Lobo/perro";
    case "cat":
      return "Gato";
    case "ocelot":
      return "Ocelote";
    case "parrot":
      return "Loro";
    case "horse":
      return "Caballo";
    case "donkey":
      return "Burro";
    case "mule":
      return "Mula";
    case "llama":
      return "Llama";
    case "camel":
      return "Camello";
    case "panda":
      return "Panda";
    case "fox":
      return "Zorro";
    case "axolotl":
      return "Ajolote";
    case "allay":
      return "Allay";
    case "sniffer":
      return "Sniffer";
    case "armadillo":
      return "Armadillo";
    default:
      return normalizeBlockId(id) || "—";
  }
}

export function isMonitorEventType(v: string): v is MonitorEventType {
  return (MONITOR_EVENT_TYPES as string[]).includes(v);
}

/** Valor de query `event=` para agrupar fuego / lava / quema en el panel. */
export const FIRE_GROUP_FILTER_VALUE = "fire_group";

export const FIRE_GROUP_EVENT_TYPES: MonitorEventType[] = [
  "fire_start",
  "lava_place",
  "block_burn",
];

export const MONITOR_PAGE_SIZE = 100;

/** Opciones del filtro Tipo (fuego/lava/quema unificados). */
export const MONITOR_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "block_break", label: "Rompió" },
  { value: "block_place", label: "Colocó" },
  { value: FIRE_GROUP_FILTER_VALUE, label: "Fuego / lava" },
  { value: "tnt_place", label: "Colocó TNT" },
  { value: "tnt_ignite", label: "Encendió TNT" },
  { value: "wither_summon", label: "Invocó wither" },
  { value: "animal_kill", label: "Mató animal" },
];

/**
 * Resuelve el param `event` del panel a tipos de BD.
 * `null` = sin filtro de tipo.
 */
export function resolveMonitorEventFilter(
  eventParam: string,
): MonitorEventType[] | null {
  const v = eventParam.trim();
  if (!v) return null;
  if (v === FIRE_GROUP_FILTER_VALUE) return [...FIRE_GROUP_EVENT_TYPES];
  if (isMonitorEventType(v)) return [v];
  return null;
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
    case "animal_kill":
      return "Mató animal";
    default:
      return type;
  }
}

/** Alerta: ≥3 eventos críticos (fuego/TNT/quema/wither/animales) en 10 minutos por jugador. */
export const MONITOR_ALERT_WINDOW_MS = 10 * 60 * 1000;
export const MONITOR_ALERT_MIN_EVENTS = 3;
/** Las alertas del panel duran 5 días (o hasta descartarlas). */
export const MONITOR_ALERT_RETENTION_DAYS = 5;

export const MONITOR_ALERT_CRITICAL_TYPES = new Set([
  "fire_start",
  "lava_place",
  "tnt_place",
  "tnt_ignite",
  "block_burn",
  "wither_summon",
  "animal_kill",
]);

export function isMonitorAlertCriticalType(eventType: string): boolean {
  return MONITOR_ALERT_CRITICAL_TYPES.has(eventType);
}

export type MonitorAlertCounts = Record<string, number>;

/** Prefijo en countsJson para desglose por especie: animal_kill:wolf */
export const ANIMAL_KILL_COUNT_PREFIX = "animal_kill:";

export function animalKillCountKey(animalId: string): string {
  const id = normalizeBlockId(animalId) || "unknown";
  return `${ANIMAL_KILL_COUNT_PREFIX}${id}`;
}

export function isAnimalKillCountKey(key: string): boolean {
  return key.startsWith(ANIMAL_KILL_COUNT_PREFIX);
}

export function animalIdFromCountKey(key: string): string {
  return key.slice(ANIMAL_KILL_COUNT_PREFIX.length);
}

/** Orden de presentación en la tarjeta de alerta. */
const ALERT_COUNT_DISPLAY_ORDER = [
  "block_burn",
  "fire_start",
  "lava_place",
  "tnt_place",
  "tnt_ignite",
  "wither_summon",
] as const;

export function tallyCriticalAlertTypes(
  events: Array<{
    eventType: string;
    blockType?: string | null;
    itemType?: string | null;
  }>,
): MonitorAlertCounts {
  const out: MonitorAlertCounts = {};
  for (const e of events) {
    if (!isMonitorAlertCriticalType(e.eventType)) continue;
    if (e.eventType === "animal_kill") {
      const animalId =
        normalizeBlockId(e.blockType ?? "") ||
        normalizeBlockId(e.itemType ?? "") ||
        "unknown";
      const key = animalKillCountKey(animalId);
      out[key] = (out[key] ?? 0) + 1;
      continue;
    }
    out[e.eventType] = (out[e.eventType] ?? 0) + 1;
  }
  return out;
}

export function parseAlertCountsJson(
  raw: string | null | undefined,
): MonitorAlertCounts {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: MonitorAlertCounts = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        out[k] = Math.floor(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function mergeAlertCounts(
  base: MonitorAlertCounts,
  add: MonitorAlertCounts,
): MonitorAlertCounts {
  const out: MonitorAlertCounts = { ...base };
  for (const [k, v] of Object.entries(add)) {
    if (!v) continue;
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

function animalAlertPhrase(animalId: string, n: number): string {
  const id = normalizeBlockId(animalId);
  const pair: Record<string, [string, string]> = {
    wolf: ["lobo/perro", "lobos/perros"],
    cat: ["gato", "gatos"],
    ocelot: ["ocelote", "ocelotes"],
    parrot: ["loro", "loros"],
    horse: ["caballo", "caballos"],
    donkey: ["burro", "burros"],
    mule: ["mula", "mulas"],
    llama: ["llama", "llamas"],
    camel: ["camello", "camellos"],
    panda: ["panda", "pandas"],
    fox: ["zorro", "zorros"],
    axolotl: ["ajolote", "ajolotes"],
    allay: ["allay", "allays"],
    sniffer: ["sniffer", "sniffers"],
    armadillo: ["armadillo", "armadillos"],
  };
  const [one, many] = pair[id] ?? [id || "animal", `${id || "animal"}s`];
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

function alertTypePhrase(eventType: string, n: number): string {
  if (isAnimalKillCountKey(eventType)) {
    return animalAlertPhrase(animalIdFromCountKey(eventType), n);
  }
  switch (eventType) {
    case "block_burn":
      return n === 1 ? "1 quemadura" : `${n} quemaduras`;
    case "fire_start":
      return n === 1 ? "1 fuego" : `${n} fuegos`;
    case "lava_place":
      return n === 1 ? "1 lava" : `${n} lavas`;
    case "tnt_place":
      return n === 1 ? "1 TNT colocada" : `${n} TNT colocadas`;
    case "tnt_ignite":
      return n === 1 ? "1 TNT encendida" : `${n} TNT encendidas`;
    case "wither_summon":
      return n === 1 ? "1 wither" : `${n} withers`;
    case "animal_kill":
      return n === 1 ? "1 animal" : `${n} animales`;
    default:
      return `${n} ${eventType}`;
  }
}

/** Texto del desglose; vacío si no hay conteos. */
export function formatAlertTypeBreakdown(counts: MonitorAlertCounts): string {
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const type of ALERT_COUNT_DISPLAY_ORDER) {
    const n = counts[type] ?? 0;
    if (n <= 0) continue;
    parts.push(alertTypePhrase(type, n));
    seen.add(type);
  }

  for (const animalId of MONITOR_PROTECTED_ANIMALS) {
    const key = animalKillCountKey(animalId);
    const n = counts[key] ?? 0;
    if (n <= 0) continue;
    parts.push(alertTypePhrase(key, n));
    seen.add(key);
  }

  for (const [type, n] of Object.entries(counts)) {
    if (seen.has(type) || n <= 0) continue;
    parts.push(alertTypePhrase(type, n));
  }
  return parts.join(", ");
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
