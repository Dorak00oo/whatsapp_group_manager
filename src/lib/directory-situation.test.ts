import assert from "node:assert/strict";
import { test } from "node:test";
import { rosterFieldsForSituation } from "./directory-situation.ts";

test("ausente conserva la columna activa", () => {
  const next = rosterFieldsForSituation("absent", true, "viaje");
  assert.equal(next.active, true);
  assert.equal(next.absentWithCause, true);
  assert.equal(next.absentReason, "viaje");
  assert.equal(next.reactivated, false);
  assert.equal(next.deactivated, false);
  assert.equal(next.activeHoldFromMc, true);
});

test("ausente conserva la columna inactiva", () => {
  const next = rosterFieldsForSituation("absent", false, "enfermedad");
  assert.equal(next.active, false);
  assert.equal(next.absentWithCause, true);
  assert.equal(next.reactivated, false);
  assert.equal(next.deactivated, false);
});

test("pasar a inactivo baja de roster y quita ausencia", () => {
  const next = rosterFieldsForSituation("inactive", true, "viaje");
  assert.equal(next.active, false);
  assert.equal(next.absentWithCause, false);
  assert.equal(next.absentReason, null);
  assert.equal(next.deactivated, true);
});

test("activo normal sube a roster y quita ausencia", () => {
  const next = rosterFieldsForSituation("normal", false, "viaje");
  assert.equal(next.active, true);
  assert.equal(next.absentWithCause, false);
  assert.equal(next.reactivated, true);
});
