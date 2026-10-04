import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRemoteCmdAction,
  listedGamertag,
  parseTpCoords,
  remoteCmdDestinationDetail,
  remoteCmdLabel,
  remoteCmdNeedsDestination,
  remoteCmdNeedsTarget,
  orderAccountFirst,
  tpDestinationOptions,
} from "../src/lib/minecraft-remote-commands.ts";

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

test("cualquier jugador en línea puede ser origen o destino, incluido drako274", () => {
  assert.deepEqual(
    tpDestinationOptions(["Moderador", "drako274", "Steve"], "Moderador"),
    ["drako274", "Steve"],
  );
  assert.deepEqual(
    tpDestinationOptions(["Drako274", "Steve", "Alex"], "drako274"),
    ["Steve", "Alex"],
  );
  assert.deepEqual(
    orderAccountFirst(["Steve", "Drako274", "Alex"], "drako274"),
    ["Drako274", "Steve", "Alex"],
  );
  assert.deepEqual(
    orderAccountFirst(
      tpDestinationOptions(["Steve", "Drako274", "Alex"], "Steve"),
      "drako274",
    ),
    ["Drako274", "Alex"],
  );
  assert.equal(listedGamertag(["Steve", "Drako274"], "drako274"), "Drako274");
  assert.equal(listedGamertag(["Steve"], "Drako274"), null);
  assert.equal(remoteCmdLabel("tp"), "TP");
  assert.equal(
    remoteCmdDestinationDetail({
      action: "tp",
      destinationGamertag: "Drako274",
    }),
    "Drako274",
  );
  assert.equal(
    remoteCmdDestinationDetail({
      action: "tp",
      destinationX: "10",
      destinationY: "~",
      destinationZ: "-4",
    }),
    "10 ~ -4",
  );
});
