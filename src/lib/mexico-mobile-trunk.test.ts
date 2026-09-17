import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stripMexicoNationalTrunk,
  stripMexicoWhatsAppDigits,
} from "./mexico-mobile-trunk.ts";

test("México 521 de WhatsApp se guarda sin el 1 extra", () => {
  assert.equal(stripMexicoWhatsAppDigits("5215512345678"), "525512345678");
});

test("México 52 de 12 dígitos no se vuelve a recortar", () => {
  assert.equal(stripMexicoWhatsAppDigits("525512345678"), "525512345678");
});

test("otros países no se tocan", () => {
  assert.equal(stripMexicoWhatsAppDigits("573001112233"), "573001112233");
});

test("nacional MX que empieza por 1 y tiene 10 dígitos más descarta el 1", () => {
  assert.equal(stripMexicoNationalTrunk("MX", "15512345678"), "5512345678");
  assert.equal(stripMexicoNationalTrunk("mx", "5512345678"), "5512345678");
  assert.equal(stripMexicoNationalTrunk("CO", "15512345678"), "15512345678");
});
