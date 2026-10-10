import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMonitorEventsQuery,
  mergeMonitorExcludeWithFiller,
  monitorDimensionLabel,
  MONITOR_PAGE_SIZE,
  NETHER_END_FILLER,
  normalizeMonitorDimension,
  parseExcludeList,
} from "../src/lib/minecraft-monitor.ts";

test("normaliza ids de dimensión de Bedrock", () => {
  assert.equal(normalizeMonitorDimension("minecraft:overworld"), "overworld");
  assert.equal(normalizeMonitorDimension("nether"), "nether");
  assert.equal(normalizeMonitorDimension("minecraft:the_end"), "the_end");
  assert.equal(normalizeMonitorDimension("end"), "the_end");
  assert.equal(normalizeMonitorDimension("void"), null);
});

test("etiquetas de pestaña", () => {
  assert.equal(monitorDimensionLabel("nether"), "Nether");
  assert.equal(monitorDimensionLabel("the_end"), "End");
  assert.equal(monitorDimensionLabel("overworld"), "Overworld");
});

test("parseExcludeList de una lista vieja añade relleno Nether/End", () => {
  const parsed = parseExcludeList(JSON.stringify(["dirt", "stone"]));
  for (const id of NETHER_END_FILLER) {
    assert.equal(parsed.includes(id), true);
  }
});

test("si ya hay netherrack no se reinyecta el relleno", () => {
  const parsed = parseExcludeList(JSON.stringify(["netherrack", "dirt"]));
  assert.deepEqual(parsed, ["netherrack", "dirt"]);
});

test("merge no duplica si la lista ya trae end_stone", () => {
  const merged = mergeMonitorExcludeWithFiller(["end_stone"]);
  assert.deepEqual(merged, ["end_stone"]);
});

test("click en alerta pone el gamertag en la query de filtros", () => {
  const q = buildMonitorEventsQuery({
    gamertag: " Maxstarz2158 ",
    item: "candle",
    dimension: "overworld",
  });
  const p = new URLSearchParams(q);
  assert.equal(p.get("gamertag"), "Maxstarz2158");
  assert.equal(p.get("item"), "candle");
  assert.equal(p.get("dimension"), "overworld");
  assert.equal(p.get("pageSize"), String(MONITOR_PAGE_SIZE));
});

test("query vacía solo manda dimensión y tamaño de página", () => {
  const p = new URLSearchParams(buildMonitorEventsQuery({ dimension: "nether" }));
  assert.equal(p.get("gamertag"), null);
  assert.equal(p.get("dimension"), "nether");
  assert.equal([...p.keys()].sort().join(","), "dimension,pageSize");
});
