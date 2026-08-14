import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseTpCoords,
  remoteCmdNeedsDestination,
  remoteCmdNeedsTarget,
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
