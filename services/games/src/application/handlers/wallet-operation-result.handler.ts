import { Injectable, Inject } from "@nestjs/common";
import type {
  WalletOperationFailedEvent,
  WalletOperationResultEvent,
} from "@crash/events";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";
import { GameRealtimeService } from "../../infrastructure/realtime/game-realtime.service";

@Injectable()
export class WalletOperationResultHandler {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository,
    private readonly realtime: GameRealtimeService,
  ) {}

  async handleDebitCompleted(event: WalletOperationResultEvent): Promise<void> {
    const round = await this.roundRepository.findCurrent();
    if (!round) {
      return;
    }

    const bet = round.findBetById(event.correlationId);
    if (!bet || bet.status !== "AWAITING_DEBIT") {
      return;
    }

    bet.activate();
    await this.roundRepository.save(round);
    this.realtime.emitBetActivated(round, bet);
  }

  async handleDebitFailed(event: WalletOperationFailedEvent): Promise<void> {
    const round = await this.roundRepository.findCurrent();
    if (!round) {
      return;
    }

    const bet = round.findBetById(event.correlationId);
    if (!bet) {
      return;
    }

    const betId = bet.id;
    round.removeBet(betId);
    await this.roundRepository.save(round);
    this.realtime.emitBetRemoved(round.id, betId);
  }
}
