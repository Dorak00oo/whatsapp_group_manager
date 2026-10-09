import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findGamertagAuditCandidates,
  slotUpdateData,
} from "../src/lib/gamertag-audit.ts";

test("un jugador que coincide exacto con un alt no se sugiere", () => {
  const out = findGamertagAuditCandidates(
    [{ id: "m1", gamertag: "Ana", mcAccount2: "AnaAlt", mcAccount3: null }],
    [{ id: "p1", gamertag: "AnaAlt" }],
  );
  assert.deepEqual(out, []);
});

test("un typo del alt sugiere corregir mcAccount2", () => {
  const out = findGamertagAuditCandidates(
    [{ id: "m1", gamertag: "Ana", mcAccount2: "AnaAlt", mcAccount3: null }],
    [{ id: "p1", gamertag: "Anaalt" }],
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]?.accountSlot, "mcAccount2");
  assert.equal(out[0]?.currentGamertag, "AnaAlt");
  assert.equal(out[0]?.suggestedGamertag, "Anaalt");
  assert.equal(out[0]?.primaryGamertag, "Ana");
});

test("slotUpdateData arma el update de cada slot", () => {
  assert.deepEqual(slotUpdateData("gamertag", "Nuevo"), { gamertag: "Nuevo" });
  assert.deepEqual(slotUpdateData("mcAccount2", "Alt2"), { mcAccount2: "Alt2" });
  assert.deepEqual(slotUpdateData("mcAccount3", "Alt3"), { mcAccount3: "Alt3" });
});
