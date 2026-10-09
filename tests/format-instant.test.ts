import assert from "node:assert/strict";
import { test } from "node:test";
import { formatInstant, formatInstantDate } from "../src/lib/format-instant.ts";

const instant = new Date("2026-10-09T18:00:00.000Z");

test("la misma instantánea cambia de reloj entre Bogota y Tijuana", () => {
  const bogota = formatInstant(instant, "America/Bogota");
  const tijuana = formatInstant(instant, "America/Tijuana");
  assert.notEqual(bogota, tijuana);
  assert.match(bogota, /2026/);
  assert.match(tijuana, /2026/);
});

test("la fecha de protección no incluye hora", () => {
  const label = formatInstantDate(instant, "America/Mexico_City");
  assert.match(label, /9/);
  assert.doesNotMatch(label, /\d:\d{2}|[ap]\.\s*m/i);
});
