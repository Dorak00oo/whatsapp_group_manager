import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GAMERTAG_SIMILARITY_THRESHOLD,
  gamertagSimilarity,
  shouldSuggestGamertagChange,
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

test("gamertags distintos no se sugieren aunque el nombre se parezca", () => {
  assert.equal(gamertagSimilarity("Sabir174997", "Siabix"), 0);
  assert.equal(gamertagSimilarity("jesuso219210", "Jessy1609453"), 0);
  assert.equal(gamertagSimilarity("Leroy GT9138", "Leroy1873"), 0);
  assert.equal(gamertagSimilarity("Drako274", "Draks1780"), 0);
});

test("mayúsculas y espacios no gastan los 4 y pueden ser todos", () => {
  const onlyCaseAndSpaces = gamertagSimilarity(
    "S  U  N  S  H  I  N  E",
    "sunshine",
  );
  assert.ok(onlyCaseAndSpaces >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(onlyCaseAndSpaces < 1);

  const fourBesidesSpaces = gamertagSimilarity(
    "S  U  N  S  H  I  N  E",
    "s u n w x y z e",
  );
  assert.ok(fourBesidesSpaces >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(fourBesidesSpaces < 1);

  assert.equal(
    gamertagSimilarity("S  U  N  S  H  I  N  E", "z u n w x y z e"),
    0,
  );
});

test("hasta 4 caracteres sí; 5 ya no", () => {
  const four = gamertagSimilarity("Sunshine", "Sunwxyze");
  assert.ok(four >= GAMERTAG_SIMILARITY_THRESHOLD);
  assert.ok(four < 1);
  assert.equal(gamertagSimilarity("Sunshine", "Zunwxyze"), 0);
});

test("un nombre corto de tres letras no se acerca por una letra", () => {
  assert.equal(gamertagSimilarity("Ana", "Ani"), 0);
});

test("el de Minecraft ya exacto no se sugiere para otro", () => {
  assert.equal(
    shouldSuggestGamertagChange("Drako274", "Draks1780", {
      directoryTags: ["Drako274"],
      minecraftTags: ["Drako274", "Draks1780"],
    }),
    false,
  );
  assert.equal(
    shouldSuggestGamertagChange("Sabir174997", "Siabix", {
      directoryTags: ["Siabix", "Sabir174997"],
      minecraftTags: ["Siabix"],
    }),
    false,
  );
  assert.equal(
    shouldSuggestGamertagChange("Luxen py", "luxen_py", {
      directoryTags: ["Luxen py"],
      minecraftTags: ["luxen_py"],
    }),
    true,
  );
});
