/**
 * Auto-ban por inactividad en el **panel**. El addon se queda en false.
 * Ponelo en true cuando quieras que `daysBlacklist` marque gente solo.
 */
export const AUTO_BLACKLIST_FROM_INACTIVITY = false;

export type MinecraftListState = {
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  inactivityBlacklistExemptUntilSeen: boolean;
};

export function emptyMinecraftListState(): MinecraftListState {
  return {
    isBlacklisted: false,
    isWhitelisted: false,
    inactivityBlacklistExemptUntilSeen: false,
  };
}

/**
 * La web manda. El export del mundo no pisa blacklist/whitelist.
 * Con auto=true, `daysBlacklist` marca; un hold de unban aguanta hasta que vuelva a entrar.
 */
export function mergeMinecraftListState(input: {
  existing: MinecraftListState | null;
  daysInactive: number;
  daysInactiveThreshold: number;
  daysBlacklist: number;
  autoBlacklist?: boolean;
}): MinecraftListState {
  const auto = input.autoBlacklist ?? AUTO_BLACKLIST_FROM_INACTIVITY;
  const existing = input.existing ?? emptyMinecraftListState();

  let hold = existing.inactivityBlacklistExemptUntilSeen;
  // Misma regla que isActiveByDaysInactive.
  const returned =
    input.daysInactiveThreshold < 1 ||
    input.daysInactive < input.daysInactiveThreshold;
  if (hold && returned) {
    hold = false;
  }

  let isBlacklisted = existing.isBlacklisted;
  if (
    auto &&
    !existing.isWhitelisted &&
    !hold &&
    input.daysBlacklist >= 1 &&
    input.daysInactive >= input.daysBlacklist
  ) {
    isBlacklisted = true;
  }

  return {
    isBlacklisted,
    isWhitelisted: existing.isWhitelisted,
    inactivityBlacklistExemptUntilSeen: hold,
  };
}

export function accessListGamertags(
  players: Array<{ gamertag: string; isBlacklisted: boolean; isWhitelisted: boolean }>,
): { blacklist: string[]; whitelist: string[] } {
  return {
    blacklist: players.filter((p) => p.isBlacklisted).map((p) => p.gamertag),
    whitelist: players.filter((p) => p.isWhitelisted).map((p) => p.gamertag),
  };
}
