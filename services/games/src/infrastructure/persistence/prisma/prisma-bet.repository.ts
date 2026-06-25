import { Injectable } from "@nestjs/common";
import { Bet } from "../../../domain/entities/bet.entity";
import type { BetStatus } from "../../../domain/constants/game.constants";
import type { BetRepository } from "../../../domain/repositories/game.repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string, limit: number, offset: number): Promise<Bet[]> {
    const records = await this.prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return records.map((record) =>
      Bet.reconstitute({
        id: record.id,
        roundId: record.roundId,
        userId: record.userId,
        username: record.username,
        amountCents: record.amountCents,
        status: record.status as BetStatus,
        cashoutMultiplierBps: record.cashoutMultiplierBps,
        payoutCents: record.payoutCents,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }),
    );
  }
}
