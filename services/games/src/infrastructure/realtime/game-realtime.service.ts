import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";
import { Round } from "../../domain/entities/round.entity";
import { Bet } from "../../domain/entities/bet.entity";
import { RoundResponseDto } from "../../presentation/dtos/round-response.dto";
import { BetResponseDto } from "../../presentation/dtos/bet-response.dto";
import { WS_EVENTS } from "./ws-events.constants";

@Injectable()
export class GameRealtimeService {
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitRoundSync(round: Round | null): void {
    this.server?.emit(WS_EVENTS.ROUND_SYNC, round ? RoundResponseDto.fromRound(round) : null);
  }

  emitRoundBetting(round: Round): void {
    this.server?.emit(WS_EVENTS.ROUND_BETTING, RoundResponseDto.fromRound(round));
  }

  emitRoundRunning(round: Round): void {
    this.server?.emit(WS_EVENTS.ROUND_RUNNING, {
      roundId: round.id,
      roundNumber: round.roundNumber,
      currentMultiplierBps: round.currentMultiplierBps,
      startedAt: round.startedAt?.toISOString() ?? null,
    });
  }

  emitRoundTick(round: Round): void {
    this.server?.emit(WS_EVENTS.ROUND_TICK, {
      roundId: round.id,
      roundNumber: round.roundNumber,
      currentMultiplierBps: round.currentMultiplierBps,
    });
  }

  emitRoundCrashed(round: Round): void {
    this.server?.emit(WS_EVENTS.ROUND_CRASHED, {
      ...RoundResponseDto.fromRound(round),
      serverSeed: round.serverSeed,
    });
  }

  emitBetPlaced(round: Round, bet: Bet): void {
    this.server?.emit(WS_EVENTS.BET_PLACED, {
      roundId: round.id,
      bet: BetResponseDto.fromBet(bet),
    });
  }

  emitBetActivated(round: Round, bet: Bet): void {
    this.server?.emit(WS_EVENTS.BET_ACTIVATED, {
      roundId: round.id,
      bet: BetResponseDto.fromBet(bet),
    });
  }

  emitBetRemoved(roundId: string, betId: string): void {
    this.server?.emit(WS_EVENTS.BET_REMOVED, { roundId, betId });
  }

  emitBetCashedOut(round: Round, bet: Bet): void {
    this.server?.emit(WS_EVENTS.BET_CASHED_OUT, {
      roundId: round.id,
      bet: BetResponseDto.fromBet(bet),
    });
  }
}
