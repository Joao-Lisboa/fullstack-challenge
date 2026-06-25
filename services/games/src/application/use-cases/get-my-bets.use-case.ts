import { Injectable, Inject } from "@nestjs/common";
import type { BetRepository } from "../../domain/repositories/game.repository.port";
import { BET_REPOSITORY } from "../../domain/repositories/game.repository.port";

@Injectable()
export class GetMyBetsUseCase {
  constructor(@Inject(BET_REPOSITORY) private readonly betRepository: BetRepository) {}

  async execute(userId: string, limit = 20, offset = 0) {
    return this.betRepository.findByUser(userId, limit, offset);
  }
}
