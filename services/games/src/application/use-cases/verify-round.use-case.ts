import { Injectable, Inject } from "@nestjs/common";
import { verifyCrashPoint } from "../../domain/services/provably-fair.service";
import { GAME_CONFIG } from "../../domain/constants/game.constants";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";

@Injectable()
export class VerifyRoundUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository) {}

  async execute(roundId: string) {
    const round = await this.roundRepository.findById(roundId);
    if (!round) {
      return null;
    }

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      serverSeed: round.status === "CRASHED" ? round.serverSeed : null,
      serverSeedHash: round.serverSeedHash,
      crashPointBps: round.crashPointBps,
      verified: verifyCrashPoint(round.serverSeed, round.crashPointBps, GAME_CONFIG.houseEdgeBps),
      status: round.status,
    };
  }
}
