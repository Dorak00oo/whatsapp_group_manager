import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SEARCH_DEBOUNCE_MS,
  shouldMirrorExternalSearch,
} from "./search-debounce.ts";

test("el debounce de búsqueda espera 300 ms", () => {
  assert.equal(SEARCH_DEBOUNCE_MS, 300);
});

test("no pisa el input si el usuario ya escribió más que lo enviado", () => {
  assert.equal(
    shouldMirrorExternalSearch({
      draft: "juanito",
      lastSent: "juan",
      incoming: "juan",
      focused: false,
    }),
    false,
  );
});

test("no pisa el input mientras el campo tiene foco", () => {
  assert.equal(
    shouldMirrorExternalSearch({
      draft: "juan",
      lastSent: "juan",
      incoming: "steve",
      focused: true,
    }),
    false,
  );
});

test("sí copia un cambio de URL cuando el campo está idle", () => {
  assert.equal(
    shouldMirrorExternalSearch({
      draft: "juanito",
      lastSent: "juanito",
      incoming: "",
      focused: false,
    }),
    true,
  );
});

test("no reescribe si la URL ya coincide con lo enviado", () => {
  assert.equal(
    shouldMirrorExternalSearch({
      draft: "juanito",
      lastSent: "juanito",
      incoming: "juanito",
      focused: false,
    }),
    false,
  );
});

test("un espacio al final no se borra por el eco de la URL", () => {
  assert.equal(
    shouldMirrorExternalSearch({
      draft: "juanito ",
      lastSent: "juanito",
      incoming: "juanito",
      focused: false,
    }),
    false,
  );
});
