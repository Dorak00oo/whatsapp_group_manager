import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyBotStatus,
  isLoopbackControlUrl,
  usesCoolifyBotControl,
  type WspBotConsoleView,
} from "./wsp-bot-console.ts";

test("bot apagado si el proxy no alcanza el proceso", () => {
  const view: WspBotConsoleView = {
    ok: false,
    offline: true,
    error: "down",
  };
  assert.equal(classifyBotStatus(view), "offline");
});

test("esperando vínculo si corre pero no hay sesión", () => {
  const view: WspBotConsoleView = {
    ok: true,
    offline: false,
    connected: false,
    registered: false,
    userName: null,
    userJid: null,
    pairingCode: null,
    qrUpdatedAt: "2026-08-28T00:00:00.000Z",
    pairingUpdatedAt: null,
    hasQr: true,
    logs: [],
  };
  assert.equal(classifyBotStatus(view), "waiting");
});

test("enlazado cuando Baileys abrió la conexión", () => {
  const view: WspBotConsoleView = {
    ok: true,
    offline: false,
    connected: true,
    registered: true,
    userName: "Comunidad",
    userJid: "57300@s.whatsapp.net",
    pairingCode: null,
    qrUpdatedAt: null,
    pairingUpdatedAt: null,
    hasQr: false,
    logs: [],
  };
  assert.equal(classifyBotStatus(view), "connected");
});

test("Prender/Apagar van a Coolify si hay UUID y token", () => {
  assert.equal(
    usesCoolifyBotControl({
      WSP_BOT_COOLIFY_UUID: "abc",
      COOLIFY_TOKEN: "tok",
    }),
    true,
  );
  assert.equal(
    usesCoolifyBotControl({ WSP_BOT_COOLIFY_UUID: "abc" }),
    false,
  );
});

test("127.0.0.1 es consola local; el hostname del contenedor no", () => {
  assert.equal(isLoopbackControlUrl("http://127.0.0.1:3010"), true);
  assert.equal(isLoopbackControlUrl("http://rp15pvuvs8b5lqeappbjibg3:3010"), false);
});
