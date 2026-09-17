import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseDirectoryAge,
  splitAgeFromNotes,
} from "./directory-age.ts";

test("edad vacía es opcional", () => {
  assert.deepEqual(parseDirectoryAge(""), { ok: true, age: null });
  assert.deepEqual(parseDirectoryAge("  "), { ok: true, age: null });
});

test("edad acepta enteros de 1 a 99", () => {
  assert.deepEqual(parseDirectoryAge("18"), { ok: true, age: 18 });
  assert.deepEqual(parseDirectoryAge("1"), { ok: true, age: 1 });
  assert.deepEqual(parseDirectoryAge("99"), { ok: true, age: 99 });
});

test("edad inválida se rechaza", () => {
  assert.equal(parseDirectoryAge("0").ok, false);
  assert.equal(parseDirectoryAge("100").ok, false);
  assert.equal(parseDirectoryAge("abc").ok, false);
  assert.equal(parseDirectoryAge("18.5").ok, false);
});

test("nota que es solo la edad se mueve al campo edad", () => {
  assert.deepEqual(splitAgeFromNotes("18"), { age: 18, notes: null });
  assert.deepEqual(splitAgeFromNotes("18 años"), { age: 18, notes: null });
  assert.deepEqual(splitAgeFromNotes("  7 anos  "), { age: 7, notes: null });
});

test("nota mezclada no se interpreta como edad", () => {
  assert.deepEqual(splitAgeFromNotes("18, juega bedrock"), {
    age: null,
    notes: "18, juega bedrock",
  });
  assert.deepEqual(splitAgeFromNotes(null), { age: null, notes: null });
});
