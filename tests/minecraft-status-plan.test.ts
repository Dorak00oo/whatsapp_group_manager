import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planMinecraftPlayerWrites,
  planStaleMinecraftPlayers,
  shouldRevalidateDirectory,
} from "../src/lib/minecraft-status-plan.ts";

const existing = {
  id: "p1",
  gamertag: "Steve",
  isBlacklisted: false,
  isWhitelisted: true,
  inactivityBlacklistExemptUntilSeen: false,
};

test("actualiza al que ya está y crea al nuevo; la última fila gana", () => {
  const writes = planMinecraftPlayerWrites({
    daysInactiveThreshold: 7,
    daysBlacklist: 30,
    existing: [existing, { ...existing, id: "p0", gamertag: "steve" }],
    players: [
      { name: " steve ", lastSeen: 1_700_000_000_000, daysInactive: 0 },
      { name: "Alex", lastSeen: 1_700_000_100_000, daysInactive: 9 },
      { name: "Steve", lastSeen: 1_700_000_200_000, daysInactive: 2 },
      { name: "   ", lastSeen: 0, daysInactive: 0 },
    ],
  });
  assert.equal(writes.length, 2);
  const steve = writes.find((w) => w.op === "update");
  const alex = writes.find((w) => w.op === "create");
  assert.equal(steve?.op === "update" ? steve.id : "", "p0");
  assert.equal(steve?.data.active, true);
  assert.equal(steve?.data.daysInactive, 2);
  assert.equal(steve?.data.isWhitelisted, true);
  assert.equal(alex?.op === "create" ? alex.gamertag : "", "Alex");
  assert.equal(alex?.data.active, false);
});

test("un roster completo marca obsoletos; uno parcial no", () => {
  const full = planStaleMinecraftPlayers({
    existing: [
      { id: "a", gamertag: "Steve" },
      { id: "b", gamertag: "Alex" },
    ],
    seenNames: ["steve"],
    totalReported: 1,
    reportedCount: 1,
  });
  assert.deepEqual(full.ids, ["b"]);

  const partial = planStaleMinecraftPlayers({
    existing: [{ id: "b", gamertag: "Alex" }],
    seenNames: ["steve"],
    totalReported: 10,
    reportedCount: 1,
  });
  assert.deepEqual(partial.ids, []);
});

test("revalida como máximo cada 30 segundos", () => {
  assert.equal(shouldRevalidateDirectory(null, 1_000), true);
  assert.equal(shouldRevalidateDirectory(1_000, 30_999), false);
  assert.equal(shouldRevalidateDirectory(1_000, 31_000), true);
});
