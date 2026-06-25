import { Injectable, Inject } from "@nestjs/common";
import { Round } from "../../domain/entities/round.entity";
import { Bet } from "../../domain/entities/bet.entity";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";
import { CashoutNotAllowedError } from "../../domain/errors/game.errors";
import { GameEventsPublisher } from "../../infrastructure/messaging/game-events.publisher";
import { GameRealtimeService } from "../../infrastructure/realtime/game-realtime.service";
import { RoutingKeys } from "@crash/events";

@Injectable()
export class CashoutUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository,
    private readonly publisher: GameEventsPublisher,
    private readonly realtime: GameRealtimeService,
  ) {}

  async execute(userId: string): Promise<{ round: Round; bet: Bet; payoutCents: bigint }> {
    const round = await this.roundRepository.findCurrent();
    if (!round) {
      throw new CashoutNotAllowedError();
    }

    const result = round.cashOut(userId);
    await this.roundRepository.save(round);

    await this.publisher.publish(RoutingKeys.CASHOUT_COMPLETED, {
      eventId: crypto.randomUUID(),
      correlationId: result.bet.id,
      userId,
      amountCents: result.payoutCents.toString(),
      occurredAt: new Date().toISOString(),
    });

    this.realtime.emitBetCashedOut(round, result.bet);

    return { round, bet: result.bet, payoutCents: result.payoutCents };
  }
}
