export const MULTIPLIER_BASE_BPS = 10_000;

export const GAME_CONFIG = {
  bettingDurationMs: 10_000,
  tickIntervalMs: 50,
  houseEdgeBps: 100,
  minBetCents: 100n,
  maxBetCents: 100_000n,
  growthFactorBps: 10_070,
} as const;

export type RoundStatus = "BETTING" | "RUNNING" | "CRASHED";
export type BetStatus = "AWAITING_DEBIT" | "ACTIVE" | "CASHED_OUT" | "LOST";
