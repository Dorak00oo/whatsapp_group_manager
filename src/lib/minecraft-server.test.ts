import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MINECRAFT_SERVER_ID,
  activeMinecraftServerIds,
  activeOnLabel,
  allowlistRemovalServerIds,
  flavorLabel,
  groupWorldActivityByGamertag,
  isCommunityActiveFromWorlds,
  minecraftQueueId,
  minecraftQueueIdsToRead,
  minecraftLinkStatus,
  minecraftLinkStatusLabel,
  parseMinecraftServerId,
  primaryParcelIdForServer,
  resolveMinecraftServerId,
  resolveMinecraftServerIdFromRequest,
  parseMinecraftInstallId,
  installIdFromRequest,
  classifyAddonIdentity,
} from "./minecraft-server.ts";

test("parseMinecraftServerId acepta vanilla y mods", () => {
  assert.equal(parseMinecraftServerId("vanilla"), "vanilla");
  assert.equal(parseMinecraftServerId("MODS"), "mods");
  assert.equal(parseMinecraftServerId("  vanilla  "), "vanilla");
  assert.equal(parseMinecraftServerId("java"), null);
  assert.equal(parseMinecraftServerId(""), null);
  assert.equal(parseMinecraftServerId(undefined), null);
});

test("sin id se usa vanilla", () => {
  assert.equal(resolveMinecraftServerId(null), DEFAULT_MINECRAFT_SERVER_ID);
  assert.equal(resolveMinecraftServerId("nope"), "vanilla");
});

test("colas van prefijadas por mundo", () => {
  assert.equal(
    minecraftQueueId("mods", "online_players"),
    "mods:online_players",
  );
  assert.deepEqual(minecraftQueueIdsToRead("mods", "online_players"), [
    "mods:online_players",
  ]);
  assert.deepEqual(
    minecraftQueueIdsToRead("vanilla", "minecraft_sync_request"),
    ["vanilla:minecraft_sync_request", "minecraft_sync_request"],
  );
});

test("parcela primary de mods no pisa primary de vanilla", () => {
  assert.equal(primaryParcelIdForServer("vanilla"), "primary");
  assert.equal(primaryParcelIdForServer("mods"), "mods:primary");
});

test("header gana sobre body y query", () => {
  const req = new Request(
    "https://wsp.example/api/minecraft/status?serverId=mods",
    { headers: { "X-Minecraft-Server-Id": "vanilla" } },
  );
  assert.equal(
    resolveMinecraftServerIdFromRequest(req, { serverId: "mods" }),
    "vanilla",
  );
});

test("sin header usa body y si no query y si no vanilla", () => {
  assert.equal(
    resolveMinecraftServerIdFromRequest(
      new Request("https://wsp.example/api/minecraft/online"),
      { serverId: "mods" },
    ),
    "mods",
  );
  assert.equal(
    resolveMinecraftServerIdFromRequest(
      new Request("https://wsp.example/api/minecraft/online?world=mods"),
    ),
    "mods",
  );
  assert.equal(
    resolveMinecraftServerIdFromRequest(
      new Request("https://wsp.example/api/minecraft/online"),
    ),
    "vanilla",
  );
});

test("activo comunitario: al menos un mundo activo y sin blacklist", () => {
  assert.equal(
    isCommunityActiveFromWorlds([
      { active: false, isBlacklisted: false },
      { active: true, isBlacklisted: false },
    ]),
    true,
  );
  assert.equal(
    isCommunityActiveFromWorlds([
      { active: false, isBlacklisted: false },
      { active: false, isBlacklisted: false },
    ]),
    false,
  );
  assert.equal(
    isCommunityActiveFromWorlds([
      { active: true, isBlacklisted: true },
      { active: true, isBlacklisted: false },
    ]),
    true,
  );
  assert.equal(
    isCommunityActiveFromWorlds([{ active: true, isBlacklisted: true }]),
    false,
  );
});

test("activeOn lista vanilla, mods o ambos", () => {
  const ids = activeMinecraftServerIds([
    { serverId: "vanilla", active: true, isBlacklisted: false },
    { serverId: "mods", active: false, isBlacklisted: false },
  ]);
  assert.deepEqual(ids, ["vanilla"]);
  assert.equal(activeOnLabel(ids), "Activo en Vanilla");
  assert.equal(
    activeOnLabel(["vanilla", "mods"]),
    "Activo en Vanilla y Mods",
  );
  assert.equal(activeOnLabel([]), "Inactivo en Minecraft");
  assert.equal(flavorLabel("mods"), "Bedrock · Mods");
  assert.equal(flavorLabel("vanilla"), "Bedrock · Vanilla");
});

test("enqueue scope all cubre vanilla y mods", () => {
  assert.deepEqual(allowlistRemovalServerIds("all"), ["vanilla", "mods"]);
  assert.deepEqual(allowlistRemovalServerIds("mods"), ["mods"]);
  assert.deepEqual(allowlistRemovalServerIds("vanilla"), ["vanilla"]);
});

test("unión por gamertag agrupa mundos", () => {
  const map = groupWorldActivityByGamertag([
    { gamertag: "Alex", serverId: "vanilla", active: false, isBlacklisted: false },
    { gamertag: "alex", serverId: "mods", active: true, isBlacklisted: false },
  ]);
  const worlds = map.get("alex") ?? [];
  assert.equal(worlds.length, 2);
});

test("enlace addon: live, quiet, offline o never", () => {
  const now = Date.parse("2026-08-29T20:00:00.000Z");
  assert.equal(minecraftLinkStatus(null, now), "never");
  assert.equal(
    minecraftLinkStatus(new Date(now - 3_000), now),
    "live",
  );
  assert.equal(
    minecraftLinkStatus(new Date(now - 60_000), now),
    "quiet",
  );
  assert.equal(
    minecraftLinkStatus(new Date(now - 10 * 60_000), now),
    "offline",
  );
  assert.equal(minecraftLinkStatusLabel("live"), "En línea");
});

test("parseMinecraftInstallId solo acepta UUIDv4", () => {
  assert.equal(
    parseMinecraftInstallId("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(
    parseMinecraftInstallId("  550E8400-E29B-41D4-A716-446655440000  "),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(
    parseMinecraftInstallId("550e8400-e29b-11d4-a716-446655440000"),
    null,
  );
  assert.equal(parseMinecraftInstallId("not-a-uuid"), null);
  assert.equal(parseMinecraftInstallId(""), null);
});

test("installIdFromRequest lee header y si no body", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const req = new Request("https://wsp.example/api/minecraft/status", {
    headers: { "X-Minecraft-Install-Id": id },
  });
  assert.equal(installIdFromRequest(req, { installId: "nope" }), id);
  assert.equal(
    installIdFromRequest(
      new Request("https://wsp.example/api/minecraft/status"),
      { installId: id },
    ),
    id,
  );
  assert.equal(
    installIdFromRequest(new Request("https://wsp.example/api/minecraft/status")),
    null,
  );
});

test("classifyAddonIdentity: UUID mapeado gana; si no, pendiente; sin UUID, header legacy", () => {
  const installId = "550e8400-e29b-41d4-a716-446655440000";
  const mappedReq = new Request("https://wsp.example/api/minecraft/status", {
    headers: {
      "X-Minecraft-Install-Id": installId,
      "X-Minecraft-Server-Id": "vanilla",
    },
  });
  assert.deepEqual(
    classifyAddonIdentity({
      installId: parseMinecraftInstallId(installId),
      mappedServerId: "mods",
      request: mappedReq,
      body: { serverId: "vanilla" },
    }),
    { kind: "mapped", installId, serverId: "mods" },
  );
  assert.deepEqual(
    classifyAddonIdentity({
      installId: parseMinecraftInstallId(installId),
      mappedServerId: null,
      request: mappedReq,
    }),
    { kind: "pending", installId },
  );
  assert.deepEqual(
    classifyAddonIdentity({
      installId: null,
      mappedServerId: null,
      request: new Request("https://wsp.example/api/minecraft/status", {
        headers: { "X-Minecraft-Server-Id": "mods" },
      }),
    }),
    { kind: "legacy", serverId: "mods" },
  );
});
