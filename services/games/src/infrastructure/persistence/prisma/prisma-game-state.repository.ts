import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { generateSeedChain, hashSeed } from "../../../domain/services/provably-fair.service";
import type { GameStateRepository } from "../../../domain/repositories/game.repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaGameStateRepository implements GameStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(): Promise<{
    currentRoundId: string | null;
    nextRoundNumber: number;
    genesisSeed: string;
    pendingServerSeed: string;
  }> {
    const existing = await this.prisma.gameState.findUnique({ where: { id: 1 } });
    if (existing) {
      return {
        currentRoundId: existing.currentRoundId,
        nextRoundNumber: existing.nextRoundNumber,
        genesisSeed: existing.genesisSeed,
        pendingServerSeed: existing.pendingServerSeed,
      };
    }

    const genesisSeed = randomBytes(32).toString("hex");
    const chain = generateSeedChain(2, genesisSeed);

    const created = await this.prisma.gameState.create({
      data: {
        id: 1,
        genesisSeed,
        pendingServerSeed: chain[1]!,
        nextRoundNumber: 1,
      },
    });

    return {
      currentRoundId: created.currentRoundId,
      nextRoundNumber: created.nextRoundNumber,
      genesisSeed: created.genesisSeed,
      pendingServerSeed: created.pendingServerSeed,
    };
  }

  async setCurrentRound(
    roundId: string,
    nextPendingSeed: string,
    nextRoundNumber: number,
  ): Promise<void> {
    await this.prisma.gameState.update({
      where: { id: 1 },
      data: {
        currentRoundId: roundId,
        pendingServerSeed: nextPendingSeed,
        nextRoundNumber,
      },
    });
  }

  async advancePendingSeed(nextPendingSeed: string): Promise<void> {
    await this.prisma.gameState.update({
      where: { id: 1 },
      data: { pendingServerSeed: nextPendingSeed },
    });
  }
}

export function nextSeedInChain(currentSeed: string): string {
  return hashSeed(currentSeed);
}
