import assert from "node:assert/strict";
import { test } from "node:test";
import { isLogScrolledToEnd, shouldShowJumpToLatestLog } from "./log-scroll.ts";

test("sin overflow ya estás en el último log", () => {
  const el = { scrollHeight: 120, scrollTop: 0, clientHeight: 120 };
  assert.equal(isLogScrolledToEnd(el), true);
  assert.equal(shouldShowJumpToLatestLog(el), false);
});

test("scrolleado hasta el fondo no muestra el botón", () => {
  const el = { scrollHeight: 1000, scrollTop: 800, clientHeight: 200 };
  assert.equal(isLogScrolledToEnd(el), true);
  assert.equal(shouldShowJumpToLatestLog(el), false);
});

test("más arriba del último log muestra el botón", () => {
  const el = { scrollHeight: 1000, scrollTop: 40, clientHeight: 200 };
  assert.equal(isLogScrolledToEnd(el), false);
  assert.equal(shouldShowJumpToLatestLog(el), true);
});
