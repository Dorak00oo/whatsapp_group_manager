import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUTO_BLACKLIST_FROM_INACTIVITY,
  emptyMinecraftListState,
  mergeMinecraftListState,
} from "./minecraft-list-merge.ts";

const base = {
  daysInactiveThreshold: 7,
  daysBlacklist: 14,
};

test("el auto-ban del panel está apagado", () => {
  assert.equal(AUTO_BLACKLIST_FROM_INACTIVITY, false);
});

test("con auto apagado no banea aunque lleve 20 días", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: emptyMinecraftListState(),
    daysInactive: 20,
  });
  assert.equal(next.isBlacklisted, false);
});

test("con auto on, 20 días sin WL ni hold → blacklist", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: {
      isBlacklisted: false,
      isWhitelisted: false,
      inactivityBlacklistExemptUntilSeen: false,
    },
    daysInactive: 20,
    autoBlacklist: true,
  });
  assert.equal(next.isBlacklisted, true);
});

test("con auto on, whitelist no entra al auto-ban", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: {
      isBlacklisted: false,
      isWhitelisted: true,
      inactivityBlacklistExemptUntilSeen: false,
    },
    daysInactive: 30,
    autoBlacklist: true,
  });
  assert.equal(next.isBlacklisted, false);
  assert.equal(next.isWhitelisted, true);
});

test("unban con hold no se re-banea aunque siga inactivo", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: {
      isBlacklisted: false,
      isWhitelisted: false,
      inactivityBlacklistExemptUntilSeen: true,
    },
    daysInactive: 40,
    autoBlacklist: true,
  });
  assert.equal(next.isBlacklisted, false);
  assert.equal(next.inactivityBlacklistExemptUntilSeen, true);
});

test("al volver a entrar se limpia el hold", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: {
      isBlacklisted: false,
      isWhitelisted: false,
      inactivityBlacklistExemptUntilSeen: true,
    },
    daysInactive: 0,
    autoBlacklist: true,
  });
  assert.equal(next.inactivityBlacklistExemptUntilSeen, false);
  assert.equal(next.isBlacklisted, false);
});

test("fila nueva no toma listas del mundo", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: null,
    daysInactive: 3,
    autoBlacklist: false,
  });
  assert.deepEqual(next, emptyMinecraftListState());
});

test("ban a mano se conserva en el export", () => {
  const next = mergeMinecraftListState({
    ...base,
    existing: {
      isBlacklisted: true,
      isWhitelisted: false,
      inactivityBlacklistExemptUntilSeen: false,
    },
    daysInactive: 0,
    autoBlacklist: false,
  });
  assert.equal(next.isBlacklisted, true);
});
