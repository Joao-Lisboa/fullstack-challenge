import { Injectable, Inject } from "@nestjs/common";
import { Round } from "../../domain/entities/round.entity";
import type { RoundRepository, GameStateRepository } from "../../domain/repositories/game.repository.port";
import {
  GAME_STATE_REPOSITORY,
  ROUND_REPOSITORY,
} from "../../domain/repositories/game.repository.port";
import { nextSeedInChain } from "../../infrastructure/persistence/prisma/prisma-game-state.repository";

@Injectable()
export class StartNewRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository,
    @Inject(GAME_STATE_REPOSITORY) private readonly gameStateRepository: GameStateRepository,
  ) {}

  async execute(): Promise<Round> {
    const state = await this.gameStateRepository.getOrCreate();
    const round = Round.createNew(state.nextRoundNumber, state.pendingServerSeed);
    const nextPendingSeed = nextSeedInChain(state.pendingServerSeed);

    await this.roundRepository.save(round);
    await this.gameStateRepository.setCurrentRound(
      round.id,
      nextPendingSeed,
      state.nextRoundNumber + 1,
    );

    return round;
  }
}
