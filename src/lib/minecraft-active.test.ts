import assert from "node:assert/strict";
import { test } from "node:test";
import { playersOnAccessLists } from "./minecraft-active.ts";

function player(partial: {
  id: string;
  gamertag: string;
  isBlacklisted?: boolean;
  isWhitelisted?: boolean;
  lastSeen: Date;
}) {
  return {
    id: partial.id,
    gamertag: partial.gamertag,
    lastSeen: partial.lastSeen,
    active: true,
    daysInactive: 0,
    isBlacklisted: partial.isBlacklisted ?? false,
    isWhitelisted: partial.isWhitelisted ?? false,
    createdAt: partial.lastSeen,
  };
}

test("separa blacklist y whitelist desde el roster completo de la BD", () => {
  const banned = player({
    id: "1",
    gamertag: "BannedSteve",
    isBlacklisted: true,
    lastSeen: new Date("2026-08-01T00:00:00Z"),
  });
  const trusted = player({
    id: "2",
    gamertag: "TrustedAlex",
    isWhitelisted: true,
    lastSeen: new Date("2026-08-02T00:00:00Z"),
  });
  const regular = player({
    id: "3",
    gamertag: "Regular",
    lastSeen: new Date("2026-08-03T00:00:00Z"),
  });

  const lists = playersOnAccessLists([banned, trusted, regular]);

  assert.deepEqual(
    lists.blacklist.map((p) => p.gamertag),
    ["BannedSteve"],
  );
  assert.deepEqual(
    lists.whitelist.map((p) => p.gamertag),
    ["TrustedAlex"],
  );
});

test("quien está en ambas listas aparece en blacklist y en whitelist", () => {
  const both = player({
    id: "1",
    gamertag: "Both",
    isBlacklisted: true,
    isWhitelisted: true,
    lastSeen: new Date("2026-08-01T00:00:00Z"),
  });

  const lists = playersOnAccessLists([both]);

  assert.equal(lists.blacklist.length, 1);
  assert.equal(lists.whitelist.length, 1);
  assert.equal(lists.blacklist[0]?.gamertag, "Both");
  assert.equal(lists.whitelist[0]?.gamertag, "Both");
});

test("ordena cada lista por última conexión, más reciente primero", () => {
  const older = player({
    id: "1",
    gamertag: "OldBan",
    isBlacklisted: true,
    lastSeen: new Date("2026-01-01T00:00:00Z"),
  });
  const newer = player({
    id: "2",
    gamertag: "NewBan",
    isBlacklisted: true,
    lastSeen: new Date("2026-08-01T00:00:00Z"),
  });

  const lists = playersOnAccessLists([older, newer]);

  assert.deepEqual(
    lists.blacklist.map((p) => p.gamertag),
    ["NewBan", "OldBan"],
  );
});
