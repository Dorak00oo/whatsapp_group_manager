export const MINECRAFT_SERVER_IDS = ["vanilla", "mods"] as const;

export type MinecraftServerId = (typeof MINECRAFT_SERVER_IDS)[number];

export const DEFAULT_MINECRAFT_SERVER_ID: MinecraftServerId = "vanilla";

export const MC_WORLD_COOKIE = "mc_world";

export const MINECRAFT_SERVER_HEADER = "x-minecraft-server-id";
export const MINECRAFT_FLAVOR_HEADER = "x-minecraft-flavor";
export const MINECRAFT_VERSION_HEADER = "x-minecraft-version";
export const MINECRAFT_WORLD_NAME_HEADER = "x-minecraft-world-name";
export const MINECRAFT_INSTALL_HEADER = "x-minecraft-install-id";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const MINECRAFT_SERVER_DEFAULTS: Record<
  MinecraftServerId,
  { name: string; flavor: MinecraftServerId; edition: "bedrock" }
> = {
  vanilla: { name: "Vanilla", flavor: "vanilla", edition: "bedrock" },
  mods: { name: "Mods", flavor: "mods", edition: "bedrock" },
};

export type MinecraftQueueKind =
  | "minecraft_sync_request"
  | "online_players"
  | "panel_remote_cmd";

const LEGACY_QUEUE_IDS: Record<MinecraftQueueKind, string> = {
  minecraft_sync_request: "minecraft_sync_request",
  online_players: "online_players",
  panel_remote_cmd: "panel_remote_cmd",
};

export function parseMinecraftServerId(
  raw: unknown,
): MinecraftServerId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  return MINECRAFT_SERVER_IDS.includes(id as MinecraftServerId)
    ? (id as MinecraftServerId)
    : null;
}

export function resolveMinecraftServerId(raw: unknown): MinecraftServerId {
  return parseMinecraftServerId(raw) ?? DEFAULT_MINECRAFT_SERVER_ID;
}

export function minecraftQueueId(
  serverId: MinecraftServerId,
  kind: MinecraftQueueKind,
): string {
  return `${serverId}:${kind}`;
}

/** Ids viejos (un solo mundo) + id nuevo, para no perder una cola a medias. */
export function minecraftQueueIdsToRead(
  serverId: MinecraftServerId,
  kind: MinecraftQueueKind,
): string[] {
  const next = minecraftQueueId(serverId, kind);
  if (serverId === DEFAULT_MINECRAFT_SERVER_ID) {
    return [next, LEGACY_QUEUE_IDS[kind]];
  }
  return [next];
}

export function primaryParcelIdForServer(serverId: MinecraftServerId): string {
  return serverId === DEFAULT_MINECRAFT_SERVER_ID ? "primary" : `${serverId}:primary`;
}

export type MinecraftServerHeartbeat = {
  flavor?: string | null;
  version?: string | null;
  worldName?: string | null;
};

export function parseMinecraftFlavor(
  raw: unknown,
): MinecraftServerId | null {
  return parseMinecraftServerId(raw);
}

export function headerValue(request: Request, name: string): string | null {
  const v = request.headers.get(name)?.trim();
  return v || null;
}

/**
 * Header → body.serverId → query serverId → vanilla.
 * `body` se pasa ya parseado en POST; en GET se ignora.
 */
export function resolveMinecraftServerIdFromRequest(
  request: Request,
  body?: { serverId?: unknown } | null,
): MinecraftServerId {
  const fromHeader = parseMinecraftServerId(
    headerValue(request, MINECRAFT_SERVER_HEADER),
  );
  if (fromHeader) return fromHeader;
  const fromBody = parseMinecraftServerId(body?.serverId);
  if (fromBody) return fromBody;
  const fromQuery = parseMinecraftServerId(
    new URL(request.url).searchParams.get("serverId") ??
      new URL(request.url).searchParams.get("world"),
  );
  if (fromQuery) return fromQuery;
  return DEFAULT_MINECRAFT_SERVER_ID;
}

export function parseMinecraftInstallId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  return UUID_V4_RE.test(id) ? id : null;
}

export function installIdFromRequest(
  request: Request,
  body?: { installId?: unknown } | null,
): string | null {
  const fromHeader = parseMinecraftInstallId(
    headerValue(request, MINECRAFT_INSTALL_HEADER),
  );
  if (fromHeader) return fromHeader;
  return parseMinecraftInstallId(body?.installId);
}

export type AddonIdentity =
  | { kind: "mapped"; installId: string; serverId: MinecraftServerId }
  | { kind: "pending"; installId: string }
  | { kind: "legacy"; serverId: MinecraftServerId };

export function classifyAddonIdentity(opts: {
  installId: string | null;
  mappedServerId: MinecraftServerId | null;
  request: Request;
  body?: { serverId?: unknown } | null;
}): AddonIdentity {
  if (opts.installId) {
    if (opts.mappedServerId) {
      return {
        kind: "mapped",
        installId: opts.installId,
        serverId: opts.mappedServerId,
      };
    }
    return { kind: "pending", installId: opts.installId };
  }
  return {
    kind: "legacy",
    serverId: resolveMinecraftServerIdFromRequest(opts.request, opts.body),
  };
}

export function heartbeatFromRequest(request: Request): MinecraftServerHeartbeat {
  return {
    flavor: headerValue(request, MINECRAFT_FLAVOR_HEADER),
    version: headerValue(request, MINECRAFT_VERSION_HEADER),
    worldName: headerValue(request, MINECRAFT_WORLD_NAME_HEADER),
  };
}

export function heartbeatFromRequestAndBody(
  request: Request,
  body?: {
    flavor?: unknown;
    version?: unknown;
    worldName?: unknown;
  } | null,
): MinecraftServerHeartbeat {
  const fromHeaders = heartbeatFromRequest(request);
  const fromBody = (key: "flavor" | "version" | "worldName") => {
    const v = body?.[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    flavor: fromHeaders.flavor ?? fromBody("flavor"),
    version: fromHeaders.version ?? fromBody("version"),
    worldName: fromHeaders.worldName ?? fromBody("worldName"),
  };
}

export function parseMinecraftWorldCookie(
  value: string | undefined | null,
): MinecraftServerId {
  return resolveMinecraftServerId(value);
}

export function allowlistRemovalServerIds(
  scope: MinecraftServerId | "all",
): MinecraftServerId[] {
  return scope === "all" ? [...MINECRAFT_SERVER_IDS] : [scope];
}

export function flavorLabel(flavor: string, edition = "bedrock"): string {
  const ed = edition === "bedrock" ? "Bedrock" : edition;
  if (flavor === "mods") return `${ed} · Mods`;
  if (flavor === "vanilla") return `${ed} · Vanilla`;
  return `${ed} · ${flavor}`;
}

export function activeOnLabel(
  ids: MinecraftServerId[],
  names: Partial<Record<MinecraftServerId, string>> = {},
): string {
  if (ids.length === 0) return "Inactivo en Minecraft";
  const label = (id: MinecraftServerId) => names[id] ?? MINECRAFT_SERVER_DEFAULTS[id].name;
  if (ids.length === MINECRAFT_SERVER_IDS.length) {
    return `Activo en ${label("vanilla")} y ${label("mods")}`;
  }
  return `Activo en ${ids.map(label).join(" y ")}`;
}

/** Addon de comandos pings cada ~2 s; esto es “en línea ahora”. */
export const MINECRAFT_LINK_LIVE_MS = 15_000;
/** Más viejo que esto = el BDS no está hablando con el panel. */
export const MINECRAFT_LINK_QUIET_MS = 120_000;

export type MinecraftLinkStatus = "live" | "quiet" | "offline" | "never";

export function minecraftLinkStatus(
  lastSeenAt: Date | string | null | undefined,
  nowMs: number = Date.now(),
): MinecraftLinkStatus {
  if (!lastSeenAt) return "never";
  const t =
    typeof lastSeenAt === "string"
      ? new Date(lastSeenAt).getTime()
      : lastSeenAt.getTime();
  if (Number.isNaN(t)) return "never";
  const age = nowMs - t;
  if (age <= MINECRAFT_LINK_LIVE_MS) return "live";
  if (age <= MINECRAFT_LINK_QUIET_MS) return "quiet";
  return "offline";
}

export function minecraftLinkStatusLabel(status: MinecraftLinkStatus): string {
  if (status === "live") return "En línea";
  if (status === "quiet") return "Sin ping reciente";
  if (status === "offline") return "Sin señal";
  return "Nunca contactó";
}

export type WorldActivityRow = {
  serverId: MinecraftServerId;
  active: boolean;
  isBlacklisted: boolean;
};

/** Activo en la comunidad si está activo y sin blacklist en al menos un mundo. */
export function isCommunityActiveFromWorlds(
  worlds: Array<Pick<WorldActivityRow, "active" | "isBlacklisted">>,
): boolean {
  return worlds.some((w) => w.active && !w.isBlacklisted);
}

export function activeMinecraftServerIds(
  worlds: WorldActivityRow[],
): MinecraftServerId[] {
  return MINECRAFT_SERVER_IDS.filter((id) =>
    worlds.some((w) => w.serverId === id && w.active && !w.isBlacklisted),
  );
}

export function groupWorldActivityByGamertag(
  rows: Array<{
    gamertag: string;
    serverId: string;
    active: boolean;
    isBlacklisted: boolean;
  }>,
): Map<string, WorldActivityRow[]> {
  const byTag = new Map<string, WorldActivityRow[]>();
  for (const row of rows) {
    const key = row.gamertag.trim().toLowerCase();
    const serverId = parseMinecraftServerId(row.serverId);
    if (!key || !serverId) continue;
    const list = byTag.get(key) ?? [];
    list.push({
      serverId,
      active: row.active,
      isBlacklisted: row.isBlacklisted,
    });
    byTag.set(key, list);
  }
  return byTag;
}
