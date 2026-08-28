import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyBotStatus,
  coolifyApiUrl,
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

test("https://bot.drk000.dev no es consola loopback", () => {
  assert.equal(isLoopbackControlUrl("https://bot.drk000.dev"), false);
});

test("la API de Coolify no usa el FQDN del panel WSP", () => {
  assert.equal(
    coolifyApiUrl({ WSP_COOLIFY_API_URL: "https://coolify.drk000.dev" }),
    "https://coolify.drk000.dev",
  );
  assert.equal(
    coolifyApiUrl({ COOLIFY_URL: "https://wsp.drk000.dev" }),
    "http://coolify:8080",
  );
  assert.equal(
    coolifyApiUrl({ COOLIFY_URL: "http://coolify:8080" }),
    "http://coolify:8080",
  );
});
