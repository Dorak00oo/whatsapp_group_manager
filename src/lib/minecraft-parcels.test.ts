import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_EXTRA_PARCELS,
  PARCEL_RETENTION_DAYS,
  PRIMARY_PARCEL_ID,
  canAddExtraParcel,
  canDeleteParcel,
  extraParcelCreatePayload,
  resolveEventParcelId,
} from "./minecraft-parcel.ts";

test("la parcela original no se puede borrar", () => {
  assert.equal(canDeleteParcel(true), false);
  assert.equal(canDeleteParcel(false), true);
});

test("historial de parcela se conserva 6 meses", () => {
  assert.equal(PARCEL_RETENTION_DAYS, 180);
});

test("tope de 5 parcelas extra", () => {
  assert.equal(MAX_EXTRA_PARCELS, 5);
  assert.equal(canAddExtraParcel(0), true);
  assert.equal(canAddExtraParcel(4), true);
  assert.equal(canAddExtraParcel(5), false);
});

test("evento sin parcela conocida cae en primary", () => {
  const known = new Set(["primary", "otra"]);
  assert.equal(resolveEventParcelId("", known), "primary");
  assert.equal(resolveEventParcelId("otra", known), "otra");
  assert.equal(resolveEventParcelId("fantasma", known), "primary");
});

test("primary de mods no pisa la parcela primary de vanilla", () => {
  const known = new Set(["mods:primary", "extra-mods"]);
  assert.equal(
    resolveEventParcelId("", known, "mods:primary"),
    "mods:primary",
  );
  assert.equal(
    resolveEventParcelId("fantasma", known, "mods:primary"),
    "mods:primary",
  );
  assert.equal(
    resolveEventParcelId("extra-mods", known, "mods:primary"),
    "extra-mods",
  );
});

test("una extra nueva nace apagada con caja por defecto", () => {
  const created = extraParcelCreatePayload(1);
  assert.equal(created.enabled, false);
  assert.equal(created.isPrimary, false);
  assert.equal(created.dimension, "overworld");
  assert.equal(created.name, "Parcela 2");
  assert.notEqual(created.id, PRIMARY_PARCEL_ID);
});
