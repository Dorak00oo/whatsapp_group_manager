import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseRadius,
  splitPastedCoords,
  tryParseCoordNumber,
} from "./xyz-coords.ts";

test("pega tres coords con comas y espacios", () => {
  assert.deepEqual(splitPastedCoords("1304, 76, 4848"), [
    "1304",
    "76",
    "4848",
  ]);
});

test("pega tres coords sin comas", () => {
  assert.deepEqual(splitPastedCoords("-8532 67 -10351"), [
    "-8532",
    "67",
    "-10351",
  ]);
});

test("pega tres coords con comas pegadas", () => {
  assert.deepEqual(splitPastedCoords("1304,76,4848"), ["1304", "76", "4848"]);
});

test("quita comas y colapsa espacios extra", () => {
  assert.deepEqual(splitPastedCoords("  10,   20 ,  30  "), [
    "10",
    "20",
    "30",
  ]);
});

test("un solo número no se parte", () => {
  assert.equal(splitPastedCoords("-8532"), null);
  assert.equal(splitPastedCoords("1304,"), null);
});

test("dos números no alcanzan", () => {
  assert.equal(splitPastedCoords("1304, 76"), null);
});

test("acepta relativos de Minecraft", () => {
  assert.deepEqual(splitPastedCoords("~ ~10 -4"), ["~", "~10", "-4"]);
});

test("tryParseCoordNumber ignora escritura incompleta", () => {
  assert.equal(tryParseCoordNumber("-"), null);
  assert.equal(tryParseCoordNumber(""), null);
  assert.equal(tryParseCoordNumber("-8532"), -8532);
});

test("parseRadius acepta 100 y 10.000 en formato local", () => {
  assert.equal(parseRadius("100"), 100);
  assert.equal(parseRadius("10.000"), 10000);
  assert.equal(parseRadius("10,000"), 10000);
  assert.equal(parseRadius("10000"), 10000);
  assert.equal(parseRadius(""), null);
  assert.equal(parseRadius("-1"), null);
});
