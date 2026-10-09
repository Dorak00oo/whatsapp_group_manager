import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROVISIONAL_TIME_ZONE,
  clockWhenDatabaseUnreachable,
  decideViewerTimeZone,
  isValidTimeZoneId,
  timeZoneSettingsOptions,
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

test("sin BD: cookie válida se usa y no abre el selector", () => {
  const c = clockWhenDatabaseUnreachable("America/Bogota");
  assert.equal(c.timeZone, "America/Bogota");
  assert.deepEqual(c.decision, { status: "ready", timeZone: "America/Bogota" });
});

test("sin BD: cookie inválida o ausente cae en la zona provisional", () => {
  for (const cookie of [null, "", "No/Existe"]) {
    const c = clockWhenDatabaseUnreachable(cookie);
    assert.equal(c.timeZone, "America/Mexico_City");
    assert.deepEqual(c.decision, {
      status: "ready",
      timeZone: "America/Mexico_City",
    });
  }
});

test("Ajustes: Colombia ofrece Bogota y también zonas de MX/US", () => {
  const opts = timeZoneSettingsOptions({
    phoneCountry: "CO",
    phone: null,
    current: "America/Bogota",
  });
  const ids = opts.map((o) => o.id);
  assert.ok(ids.length > 1);
  assert.ok(ids.includes("America/Bogota"));
  assert.ok(ids.includes("America/Mexico_City"));
  assert.ok(ids.includes("America/New_York"));
  assert.equal(new Set(ids).size, ids.length);
});

test("Ajustes: infiere el país del teléfono y agrega la zona actual si falta", () => {
  const opts = timeZoneSettingsOptions({
    phoneCountry: null,
    phone: "+573001234567",
    current: "Asia/Tokyo",
  });
  assert.equal(opts[0]?.id, "America/Bogota");
  assert.equal(opts[opts.length - 1]?.id, "Asia/Tokyo");
});

test("el selector sin país tiene etiquetas únicas", () => {
  const d = decideViewerTimeZone({ timeZone: null, phoneCountry: null });
  assert.equal(d.status, "needs_choice");
  if (d.status !== "needs_choice") return;
  const labels = d.options.map((o) => o.label);
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.includes("México · Centro"));
  assert.ok(labels.includes("EE. UU. · Centro"));
});