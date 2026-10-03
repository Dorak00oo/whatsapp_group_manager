import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GAMERTAG_SIMILARITY_THRESHOLD,
  gamertagSimilarity,
} from "./gamertag-similarity.ts";

test("1 a 1 exacto no pide corrección", () => {
  assert.equal(gamertagSimilarity("SungJW1883", "SungJW1883"), 1);
});

test("sin coincidencia exacta, un espacio de más sí se sugiere", () => {
  const score = gamertagSimilarity("Sung JW1883", "SungJW1883");
  assert.ok(score >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(score < 1);
});

test("sin coincidencia exacta, espacio contra guion bajo sí se sugiere", () => {
  const score = gamertagSimilarity("Luxen py", "luxen_py");
  assert.ok(score >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(score < 1);
});

test("la base igual gana al que solo difiere por un espacio", () => {
  const exactBase = gamertagSimilarity("sungjw1883", "SungJW1883");
  const spaced = gamertagSimilarity("Sung JW1883", "SungJW1883");
  assert.ok(exactBase > spaced);
  assert.ok(spaced >= GAMERTAG_SIMILARITY_THRESHOLD);
});

test("el sufijo numérico distinto sigue sugiriéndose", () => {
  const score = gamertagSimilarity("Drako", "Drako274");
  assert.ok(score >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(score < 1);
});

test("un par de letras sí se sugiere, por debajo del espacio", () => {
  const letters = gamertagSimilarity("Luxen py", "luxen_pz");
  const spaced = gamertagSimilarity("Luxen py", "luxen_py");
  assert.ok(letters >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(letters < 1);
  assert.ok(spaced > letters);
  const two = gamertagSimilarity("Luxenpy", "Luxanpz");
  assert.ok(two >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(two < 1);
});

test("tres letras distintas no se sugieren", () => {
  assert.equal(gamertagSimilarity("Luxenpy", "Maxanqz"), 0);
});

test("un nombre corto de tres letras no se acerca por una letra", () => {
  assert.equal(gamertagSimilarity("Ana", "Ani"), 0);
});
