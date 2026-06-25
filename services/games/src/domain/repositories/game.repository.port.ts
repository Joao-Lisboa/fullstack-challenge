import { Round } from "../entities/round.entity";
import { Bet } from "../entities/bet.entity";

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  save(round: Round): Promise<void>;
  findHistory(limit: number, offset: number): Promise<Round[]>;
}

export interface GameStateRepository {
  getOrCreate(): Promise<{
    currentRoundId: string | null;
    nextRoundNumber: number;
    genesisSeed: string;
    pendingServerSeed: string;
  }>;
  setCurrentRound(roundId: string, nextPendingSeed: string, nextRoundNumber: number): Promise<void>;
  advancePendingSeed(nextPendingSeed: string): Promise<void>;
}

export interface BetRepository {
  findByUser(userId: string, limit: number, offset: number): Promise<Bet[]>;
}

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
export const GAME_STATE_REPOSITORY = Symbol("GAME_STATE_REPOSITORY");
export const BET_REPOSITORY = Symbol("BET_REPOSITORY");
