import { Injectable, Inject } from "@nestjs/common";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository) {}

  async execute() {
    return this.roundRepository.findCurrent();
  }
}

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository) {}

  async execute(limit = 20, offset = 0) {
    return this.roundRepository.findHistory(limit, offset);
  }
}
