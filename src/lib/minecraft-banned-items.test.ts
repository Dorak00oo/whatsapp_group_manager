import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseBannedItems,
  sanitizeBannedItemsList,
} from "./minecraft-banned-items.ts";

test("lista vacía o JSON inválido no banea nada", () => {
  assert.deepEqual(parseBannedItems(null), []);
  assert.deepEqual(parseBannedItems(""), []);
  assert.deepEqual(parseBannedItems("{}"), []);
  assert.deepEqual(parseBannedItems("no-json"), []);
});

test("normaliza ids, quita minecraft: y duplicados", () => {
  assert.deepEqual(
    sanitizeBannedItemsList([
      "minecraft:bedrock",
      " BEDROCK ",
      "command_block",
      "",
      12,
      "minecraft:barrier",
    ]),
    ["bedrock", "command_block", "barrier"],
  );
});

test("rechaza ids con espacios o caracteres raros", () => {
  assert.deepEqual(
    sanitizeBannedItemsList(["ok_item", "not valid", "foo/bar", "a:b_c-1"]),
    ["ok_item", "a:b_c-1"],
  );
});
