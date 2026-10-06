import assert from "node:assert/strict";
import { test } from "node:test";
import {
  duplicateMcAccountMessage,
  memberActiveOnWorlds,
  memberMcAccounts,
} from "../src/lib/member-mc-accounts.ts";

test("junta la cuenta principal con la segunda y la tercera", () => {
  assert.deepEqual(
    memberMcAccounts({
      gamertag: "Ana",
      mcAccount2: "AnaAlt",
      mcAccount3: "  ",
    }),
    ["Ana", "AnaAlt"],
  );
  assert.deepEqual(
    memberMcAccounts({
      gamertag: "Ana",
      mcAccount2: "ana",
      mcAccount3: "Ana2",
    }),
    ["Ana", "Ana2"],
  );
});

test("no deja repetir cuentas en la misma persona", () => {
  assert.equal(duplicateMcAccountMessage(["Ana", "ana2"]), null);
  assert.match(duplicateMcAccountMessage(["Ana", "ANA"]) ?? "", /repetirse/);
});

test("está en un mundo si entra con cualquiera de sus cuentas", () => {
  const worlds = new Map<string, Array<"vanilla" | "mods">>([
    ["anaalt", ["mods"]],
  ]);
  assert.deepEqual(
    memberActiveOnWorlds(
      { gamertag: "Ana", mcAccount2: "AnaAlt", mcAccount3: null },
      worlds,
    ),
    ["mods"],
  );
});
