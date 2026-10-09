import assert from "node:assert/strict";
import { test } from "node:test";
import { buildActiveCompareData } from "../src/lib/directory-minecraft-compare.ts";

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

test("un alt del directorio no sale como ausente del directorio", () => {
  const data = buildActiveCompareData(
    [
      {
        id: "wa-1",
        gamertag: "Ana",
        displayName: "Ana",
        mcAccount2: "AnaAlt",
        mcAccount3: null,
        active: true,
        leftAt: null,
      },
    ],
    [
      {
        id: "mc-1",
        gamertag: "AnaAlt",
        active: true,
        isBlacklisted: false,
        daysInactive: 0,
      },
    ],
  );
  assert.equal(data.summary.mcActiveNotInWhatsappActive.length, 0);
  assert.ok(data.whatsapp.some((r) => r.gamertag === "AnaAlt"));
  const alt = data.whatsapp.find((r) => r.gamertag === "AnaAlt");
  assert.match(alt?.label ?? "", /cuenta 2 de Ana/i);
});

test("alt de alguien que se salió sigue siendo left_group", () => {
  const data = buildActiveCompareData(
    [
      {
        id: "wa-1",
        gamertag: "Ana",
        displayName: null,
        mcAccount2: "AnaAlt",
        mcAccount3: null,
        active: false,
        leftAt: new Date("2026-01-01"),
      },
    ],
    [
      {
        id: "mc-1",
        gamertag: "AnaAlt",
        active: true,
        isBlacklisted: false,
        daysInactive: 0,
      },
    ],
  );
  assert.equal(data.summary.mcActiveNotInWhatsappActive[0]?.reason, "left_group");
});

test("un desconocido sigue siendo not_in_directory aunque otros miembros tengan alts", () => {
  const data = buildActiveCompareData(
    [
      {
        id: "wa-1",
        gamertag: "Ana",
        displayName: null,
        mcAccount2: "AnaAlt",
        mcAccount3: null,
        active: true,
        leftAt: null,
      },
    ],
    [
      {
        id: "mc-1",
        gamertag: "Stranger99",
        active: true,
        isBlacklisted: false,
        daysInactive: 3,
      },
    ],
  );
  assert.equal(
    data.summary.mcActiveNotInWhatsappActive[0]?.reason,
    "not_in_directory",
  );
});

test("alt de un miembro inactivo que sigue en el grupo no es candidato a blacklist", () => {
  const data = buildActiveCompareData(
    [
      {
        id: "wa-1",
        gamertag: "Ana",
        displayName: null,
        mcAccount2: "AnaAlt",
        mcAccount3: null,
        active: false,
        leftAt: null,
      },
    ],
    [
      {
        id: "mc-1",
        gamertag: "AnaAlt",
        active: true,
        isBlacklisted: false,
        daysInactive: 0,
      },
    ],
  );
  const row = data.summary.mcActiveNotInWhatsappActive[0];
  assert.equal(row?.detail, "En directorio pero inactivo en WhatsApp");
  assert.equal(row?.reason, null);
});
