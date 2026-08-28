import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PURGE_BATCH_MAX,
  PURGE_BATCH_SIZE,
  PURGE_CONFIRM_WORD,
  matchesPurgeConfirm,
  parsePurgeLimit,
} from "./history-purge.ts";

test("lote de purga por defecto y tope", () => {
  assert.equal(parsePurgeLimit(null), PURGE_BATCH_SIZE);
  assert.equal(parsePurgeLimit("50"), 50);
  assert.equal(parsePurgeLimit("999999"), PURGE_BATCH_MAX);
  assert.equal(parsePurgeLimit("0"), 1);
});

test("confirmación exige BORRAR", () => {
  assert.equal(PURGE_CONFIRM_WORD, "BORRAR");
  assert.equal(matchesPurgeConfirm("BORRAR"), true);
  assert.equal(matchesPurgeConfirm(" borrar "), true);
  assert.equal(matchesPurgeConfirm("borrar todo"), false);
  assert.equal(matchesPurgeConfirm(""), false);
});
