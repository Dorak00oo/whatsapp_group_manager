import assert from "node:assert/strict";
import { test } from "node:test";
import { buildActiveCompareData } from "./directory-minecraft-compare.ts";

test("activos en blacklist no entran en MC activos y se reportan como ignorados", () => {
  const data = buildActiveCompareData(
    [
      {
        id: "wa-1",
        gamertag: "Steve",
        displayName: null,
        active: true,
        leftAt: null,
      },
    ],
    [
      {
        id: "mc-1",
        gamertag: "Steve",
        active: true,
        isBlacklisted: false,
        daysInactive: 0,
      },
      {
        id: "mc-2",
        gamertag: "Alex",
        active: true,
        isBlacklisted: true,
        daysInactive: 1,
      },
      {
        id: "mc-3",
        gamertag: "Herobrine",
        active: false,
        isBlacklisted: true,
        daysInactive: 20,
      },
    ],
  );

  assert.equal(data.summary.minecraftCount, 1);
  assert.deepEqual(
    data.minecraft.map((r) => r.gamertag),
    ["Steve"],
  );
  assert.equal(data.summary.ignoredBlacklistedCount, 1);
  assert.deepEqual(
    data.summary.ignoredBlacklisted.map((r) => r.gamertag),
    ["Alex"],
  );
});

test("sin activos en blacklist, ignorados queda vacío", () => {
  const data = buildActiveCompareData(
    [],
    [
      {
        id: "mc-1",
        gamertag: "Steve",
        active: true,
        isBlacklisted: false,
        daysInactive: 0,
      },
    ],
  );
  assert.equal(data.summary.ignoredBlacklistedCount, 0);
  assert.deepEqual(data.summary.ignoredBlacklisted, []);
});
