import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decidePanelLogin,
  findAccountByGamertag,
  gamertagKey,
  isPanelOwnerGamertag,
  passwordFingerprint,
  rejectCountsAsFailure,
  secretMatches,
  type PanelAuthConfig,
} from "../src/lib/panel-credentials.ts";

const config: PanelAuthConfig = {
  ownerGamertag: "Drako274",
  ownerPassword: "clave-del-dueño",
  groupPassword: "grupal",
};

test("gamertagKey: recorta bordes y quita mayúsculas, conserva espacios internos", () => {
  assert.equal(gamertagKey("  Sung JW1883 "), "sung jw1883");
  assert.equal(isPanelOwnerGamertag(" drako274", "Drako274"), true);
  assert.equal(isPanelOwnerGamertag("", ""), false);
});

test("secretMatches: igual, distinto, largos distintos y esperado vacío", () => {
  assert.equal(secretMatches("abc", "abc"), true);
  assert.equal(secretMatches("abc", "abd"), false);
  assert.equal(secretMatches("abc", "abcd"), false);
  assert.equal(secretMatches("", ""), false);
  assert.equal(secretMatches("Abc", "abc"), false);
});

test("el dueño entra solo con su contraseña, nunca con la grupal", () => {
  assert.deepEqual(
    decidePanelLogin({ gamertag: "drako274", password: "clave-del-dueño" }, config),
    { kind: "owner", gamertag: "Drako274" },
  );
  assert.deepEqual(
    decidePanelLogin({ gamertag: "Drako274", password: "grupal" }, config),
    { kind: "reject", reason: "wrong-password" },
  );
});

test("sin PANEL_OWNER_PASSWORD el dueño no entra y no cuenta como intento", () => {
  const d = decidePanelLogin(
    { gamertag: "Drako274", password: "lo-que-sea" },
    { ...config, ownerPassword: "" },
  );
  assert.deepEqual(d, { kind: "reject", reason: "owner-password-unset" });
  assert.equal(rejectCountsAsFailure("owner-password-unset"), false);
});

test("otros gamertags: contraseña grupal → falta confirmar la cuenta", () => {
  assert.deepEqual(
    decidePanelLogin({ gamertag: " Juan123 ", password: "grupal" }, config),
    { kind: "account", gamertagKey: "juan123" },
  );
  assert.deepEqual(
    decidePanelLogin({ gamertag: "Juan123", password: "clave-del-dueño" }, config),
    { kind: "reject", reason: "wrong-password" },
  );
  assert.equal(rejectCountsAsFailure("wrong-password"), true);
  assert.deepEqual(
    decidePanelLogin({ gamertag: "correo@ejemplo.local", password: "grupal" }, config),
    { kind: "reject", reason: "wrong-password" },
  );
});

test("campos vacíos o contraseña grupal sin definir", () => {
  assert.deepEqual(decidePanelLogin({ gamertag: "  ", password: "grupal" }, config), {
    kind: "reject",
    reason: "missing-input",
  });
  assert.deepEqual(decidePanelLogin({ gamertag: "Juan", password: "" }, config), {
    kind: "reject",
    reason: "missing-input",
  });
  assert.deepEqual(
    decidePanelLogin({ gamertag: "Juan", password: "x" }, { ...config, groupPassword: "" }),
    { kind: "reject", reason: "group-password-unset" },
  );
});

test("el dueño configurable por PANEL_OWNER_GAMERTAG", () => {
  const custom = { ...config, ownerGamertag: "OtroDueño" };
  assert.equal(
    decidePanelLogin({ gamertag: "Drako274", password: "grupal" }, custom).kind,
    "account",
  );
  assert.equal(
    decidePanelLogin({ gamertag: "otrodueño", password: "clave-del-dueño" }, custom).kind,
    "owner",
  );
});

test("findAccountByGamertag: sin mayúsculas, primera coincidencia", () => {
  const accounts = [
    { id: "a1", gamertag: "Juan123" },
    { id: "a2", gamertag: "Sung JW1883" },
  ];
  assert.equal(findAccountByGamertag(accounts, "JUAN123")?.id, "a1");
  assert.equal(findAccountByGamertag(accounts, " sung jw1883 ")?.id, "a2");
  assert.equal(findAccountByGamertag(accounts, "sungjw1883"), null);
  assert.equal(findAccountByGamertag(accounts, ""), null);
});

test("passwordFingerprint: estable y distinto por contraseña", () => {
  assert.equal(passwordFingerprint("a"), passwordFingerprint("a"));
  assert.notEqual(passwordFingerprint("a"), passwordFingerprint("b"));
  assert.equal(passwordFingerprint("a").length, 16);
});
