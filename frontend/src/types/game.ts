export type RoundStatus = "BETTING" | "RUNNING" | "CRASHED";
export type BetStatus = "AWAITING_DEBIT" | "ACTIVE" | "CASHED_OUT" | "LOST";

export interface RoundBet {
  id: string;
  userId: string;
  username: string;
  amountCents: string;
  status: BetStatus;
  cashoutMultiplierBps: number | null;
  payoutCents: string | null;
}

export interface Round {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  serverSeedHash: string;
  crashPointBps: number | null;
  currentMultiplierBps: number;
  bettingEndsAt: string | null;
  startedAt: string | null;
  crashedAt: string | null;
  bets: RoundBet[];
  serverSeed?: string;
}

export interface Bet {
  id: string;
  roundId: string;
  userId: string;
  username: string;
  amountCents: string;
  status: BetStatus;
  cashoutMultiplierBps: number | null;
  payoutCents: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balanceCents: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoundTickPayload {
  roundId: string;
  roundNumber: number;
  currentMultiplierBps: number;
}

export interface RoundRunningPayload {
  roundId: string;
  roundNumber: number;
  currentMultiplierBps: number;
  startedAt: string | null;
}

export interface BetEventPayload {
  roundId: string;
  bet: Bet;
}

export interface BetRemovedPayload {
  roundId: string;
  betId: string;
}

export const WS_EVENTS = {
  ROUND_SYNC: "round:sync",
  ROUND_BETTING: "round:betting",
  ROUND_RUNNING: "round:running",
  ROUND_TICK: "round:tick",
  ROUND_CRASHED: "round:crashed",
  BET_PLACED: "bet:placed",
  BET_ACTIVATED: "bet:activated",
  BET_REMOVED: "bet:removed",
  BET_CASHED_OUT: "bet:cashed_out",
} as const;

export const GAME_LIMITS = {
  minBetCents: 100,
  maxBetCents: 100_000,
} as const;
