import { Injectable, Inject } from "@nestjs/common";
import { Bet } from "../../domain/entities/bet.entity";
import { Round } from "../../domain/entities/round.entity";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";
import { RoundNotAcceptingBetsError } from "../../domain/errors/game.errors";
import { GameEventsPublisher } from "../../infrastructure/messaging/game-events.publisher";
import { GameRealtimeService } from "../../infrastructure/realtime/game-realtime.service";
import { RoutingKeys } from "@crash/events";

export interface PlaceBetInput {
  userId: string;
  username: string;
  amountCents: bigint;
}

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository,
    private readonly publisher: GameEventsPublisher,
    private readonly realtime: GameRealtimeService,
  ) {}

  async execute(input: PlaceBetInput): Promise<{ round: Round; bet: Bet }> {
    const round = await this.roundRepository.findCurrent();
    if (!round || round.status !== "BETTING") {
      throw new RoundNotAcceptingBetsError();
    }

    const bet = Bet.create({
      roundId: round.id,
      userId: input.userId,
      username: input.username,
      amountCents: input.amountCents,
    });

    round.placeBet(bet);
    await this.roundRepository.save(round);

    await this.publisher.publish(RoutingKeys.BET_PLACED, {
      eventId: bet.id,
      correlationId: bet.id,
      userId: input.userId,
      amountCents: input.amountCents.toString(),
      occurredAt: new Date().toISOString(),
    });

    this.realtime.emitBetPlaced(round, bet);

    return { round, bet };
  }
}
