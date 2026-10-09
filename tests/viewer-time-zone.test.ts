import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROVISIONAL_TIME_ZONE,
  decideViewerTimeZone,
  isValidTimeZoneId,
} from "../src/lib/viewer-time-zone.ts";

test("Colombia con teléfono se asigna sola a Bogota", () => {
  const d = decideViewerTimeZone({ timeZone: null, phoneCountry: "CO" });
  assert.deepEqual(d, { status: "ready", timeZone: "America/Bogota" });
});

test("zona ya guardada gana al país", () => {
  const d = decideViewerTimeZone({
    timeZone: "America/Cancun",
    phoneCountry: "MX",
  });
  assert.deepEqual(d, { status: "ready", timeZone: "America/Cancun" });
});

test("México sin zona pide selector con CDMX de sugerencia", () => {
  const d = decideViewerTimeZone({ timeZone: null, phoneCountry: "MX" });
  assert.equal(d.status, "needs_choice");
  if (d.status !== "needs_choice") return;
  assert.equal(d.suggested, "America/Mexico_City");
  assert.ok(d.options.some((o) => o.id === "America/Tijuana"));
  assert.ok(d.options.some((o) => o.id === "America/Cancun"));
});

test("sin teléfono pide selector conjunto e IANA válido", () => {
  const d = decideViewerTimeZone({ timeZone: null, phoneCountry: null });
  assert.equal(d.status, "needs_choice");
  if (d.status !== "needs_choice") return;
  assert.ok(d.options.some((o) => o.id === "America/Bogota"));
  assert.equal(isValidTimeZoneId(d.suggested), true);
  assert.equal(PROVISIONAL_TIME_ZONE, "America/Mexico_City");
});
