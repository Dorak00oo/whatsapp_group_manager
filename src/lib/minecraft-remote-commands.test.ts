import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRemoteCmdAction,
  isTpPrivilegedOrigin,
  isTpProtectedDestination,
  parseTpCoords,
  remoteCmdNeedsDestination,
  remoteCmdNeedsTarget,
  tpDestinationBlockedReason,
  tpDestinationOptions,
  mergePrivilegedTpOrigin,
} from "./minecraft-remote-commands.ts";

test("coordenada vacía se convierte en ~", () => {
  const parsed = parseTpCoords({ x: "", y: "  ", z: null });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.deepEqual(parsed, { x: "~", y: "~", z: "~" });
});

test("números se conservan y vacíos se rellenan con ~", () => {
  const parsed = parseTpCoords({ x: "100", y: "", z: "-32.5" });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.deepEqual(parsed, { x: "100", y: "~", z: "-32.5" });
});

test("acepta relativos tipo ~10 y ~-4", () => {
  const parsed = parseTpCoords({ x: "~10", y: "~", z: "~-4" });
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;
  assert.deepEqual(parsed, { x: "~10", y: "~", z: "~-4" });
});

test("rechaza texto que no es coordenada", () => {
  const parsed = parseTpCoords({ x: "nether", y: "64", z: "0" });
  assert.equal("error" in parsed, true);
});

test("tp sigue necesitando gamertag origen", () => {
  assert.equal(remoteCmdNeedsTarget("tp"), true);
  assert.equal(remoteCmdNeedsDestination("tp"), true);
});

test("apagar fuego necesita al admin online como centro", () => {
  assert.equal(remoteCmdNeedsTarget("extinguish_fire"), true);
  assert.equal(remoteCmdNeedsDestination("extinguish_fire"), false);
});

test("sync_config aplica la lista baneada sin jugador destino", () => {
  assert.equal(isRemoteCmdAction("sync_config"), true);
  assert.equal(remoteCmdNeedsTarget("sync_config"), false);
  assert.equal(remoteCmdNeedsDestination("sync_config"), false);
});

test("nadie puede TP hacia drako274; él sí puede TP hacia otros", () => {
  assert.equal(isTpProtectedDestination("drako274"), true);
  assert.equal(isTpProtectedDestination("Drako274"), true);
  assert.equal(isTpProtectedDestination("otro"), false);
  assert.equal(isTpPrivilegedOrigin("Drako274"), true);
  assert.equal(isTpPrivilegedOrigin("Steve"), false);
  assert.equal(
    tpDestinationBlockedReason("drako274"),
    "No se puede teletransportar a drako274",
  );
  assert.equal(tpDestinationBlockedReason("Steve"), null);
  assert.deepEqual(
    tpDestinationOptions(["Moderador", "drako274", "Steve"], "Moderador"),
    ["Steve"],
  );
  assert.deepEqual(
    tpDestinationOptions(["drako274", "Steve", "Alex"], "drako274"),
    ["Steve", "Alex"],
  );
});

test("drako274 queda como origen de TP aunque no esté en la lista de admins", () => {
  const merged = mergePrivilegedTpOrigin(
    [{ id: "1", gamertag: "Moderador", displayName: "Mod" }],
    null,
  );
  assert.equal(merged.some((a) => isTpPrivilegedOrigin(a.gamertag)), true);
  const already = mergePrivilegedTpOrigin(
    [{ id: "1", gamertag: "Drako274", displayName: null }],
    null,
  );
  assert.equal(already.length, 1);
});
