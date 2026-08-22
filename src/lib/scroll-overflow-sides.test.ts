import assert from "node:assert/strict";
import { test } from "node:test";
import { scrollOverflowSides } from "./scroll-overflow-sides.ts";

test("sin desbordamiento no muestra lados", () => {
  assert.deepEqual(scrollOverflowSides(0, 320, 320), {
    left: false,
    right: false,
  });
});

test("al inicio con más contenido a la derecha solo marca derecha", () => {
  assert.deepEqual(scrollOverflowSides(0, 320, 480), {
    left: false,
    right: true,
  });
});

test("al final con más contenido a la izquierda solo marca izquierda", () => {
  assert.deepEqual(scrollOverflowSides(160, 320, 480), {
    left: true,
    right: false,
  });
});

test("en el medio marca ambos lados", () => {
  assert.deepEqual(scrollOverflowSides(80, 320, 480), {
    left: true,
    right: true,
  });
});
