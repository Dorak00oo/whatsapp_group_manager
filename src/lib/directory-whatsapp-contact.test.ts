import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeWhatsAppPhoneInput } from "./whatsapp-phone-normalize.ts";
import { resolveDirectoryWhatsAppContact } from "./directory-whatsapp-contact.ts";

test("un JID @lid no se trata como teléfono", () => {
  const parsed = normalizeWhatsAppPhoneInput("123456789012345@lid");
  assert.equal(parsed.ok, false);
});

test("alta: celular o usuario, no hace falta los dos", () => {
  const byPhone = resolveDirectoryWhatsAppContact({
    phoneIso: "CO",
    phoneNational: "3044445736",
    usernameRaw: "",
  });
  assert.equal(byPhone.ok, true);
  if (byPhone.ok) {
    assert.equal(byPhone.whatsappUsername, null);
    assert.equal(Boolean(byPhone.phone), true);
  }

  const byUser = resolveDirectoryWhatsAppContact({
    phoneIso: "MX",
    phoneNational: "",
    usernameRaw: "@Drak00_oo",
  });
  assert.equal(byUser.ok, true);
  if (byUser.ok) {
    assert.equal(byUser.phone, null);
    assert.equal(byUser.whatsappUsername, "drak00_oo");
  }

  const neither = resolveDirectoryWhatsAppContact({
    phoneIso: "MX",
    phoneNational: "",
    usernameRaw: "",
  });
  assert.equal(neither.ok, false);
  if (!neither.ok) assert.match(neither.error, /celular o el usuario/i);
});
