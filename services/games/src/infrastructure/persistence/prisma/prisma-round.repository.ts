import { Injectable } from "@nestjs/common";
import type { BetProps } from "../../../domain/entities/bet.entity";
import { Bet } from "../../../domain/entities/bet.entity";
import { Round } from "../../../domain/entities/round.entity";
import type { BetStatus, RoundStatus } from "../../../domain/constants/game.constants";
import type { RoundRepository } from "../../../domain/repositories/game.repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Round | null> {
    const record = await this.prisma.round.findUnique({
      where: { id },
      include: { bets: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async findCurrent(): Promise<Round | null> {
    const state = await this.prisma.gameState.findUnique({ where: { id: 1 } });
    if (!state?.currentRoundId) {
      return null;
    }

    return this.findById(state.currentRoundId);
  }

  async save(round: Round): Promise<void> {
    const props = round.toProps();

    await this.prisma.$transaction(async (tx) => {
      await tx.round.upsert({
        where: { id: props.id },
        create: {
          id: props.id,
          roundNumber: props.roundNumber,
          status: props.status,
          serverSeed: props.serverSeed,
          serverSeedHash: props.serverSeedHash,
          crashPointBps: props.crashPointBps,
          currentMultiplierBps: props.currentMultiplierBps,
          bettingEndsAt: props.bettingEndsAt,
          startedAt: props.startedAt,
          crashedAt: props.crashedAt,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
        },
        update: {
          status: props.status,
          currentMultiplierBps: props.currentMultiplierBps,
          bettingEndsAt: props.bettingEndsAt,
          startedAt: props.startedAt,
          crashedAt: props.crashedAt,
          updatedAt: props.updatedAt,
        },
      });

      for (const bet of props.bets) {
        const betProps = bet.toProps();
        await tx.bet.upsert({
          where: { id: betProps.id },
          create: {
            id: betProps.id,
            roundId: betProps.roundId,
            userId: betProps.userId,
            username: betProps.username,
            amountCents: betProps.amountCents,
            status: betProps.status,
            cashoutMultiplierBps: betProps.cashoutMultiplierBps,
            payoutCents: betProps.payoutCents,
            createdAt: betProps.createdAt,
            updatedAt: betProps.updatedAt,
          },
          update: {
            status: betProps.status,
            cashoutMultiplierBps: betProps.cashoutMultiplierBps,
            payoutCents: betProps.payoutCents,
            updatedAt: betProps.updatedAt,
          },
        });
      }
    });
  }

  async findHistory(limit: number, offset: number): Promise<Round[]> {
    const records = await this.prisma.round.findMany({
      where: { status: "CRASHED" },
      orderBy: { roundNumber: "desc" },
      take: limit,
      skip: offset,
      include: { bets: true },
    });

    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: {
    id: string;
    roundNumber: number;
    status: RoundStatus;
    serverSeed: string;
    serverSeedHash: string;
    crashPointBps: number;
    currentMultiplierBps: number;
    bettingEndsAt: Date | null;
    startedAt: Date | null;
    crashedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    bets: Array<{
      id: string;
      roundId: string;
      userId: string;
      username: string;
      amountCents: bigint;
      status: BetStatus;
      cashoutMultiplierBps: number | null;
      payoutCents: bigint | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): Round {
    return Round.reconstitute({
      id: record.id,
      roundNumber: record.roundNumber,
      status: record.status,
      serverSeed: record.serverSeed,
      serverSeedHash: record.serverSeedHash,
      crashPointBps: record.crashPointBps,
      currentMultiplierBps: record.currentMultiplierBps,
      bettingEndsAt: record.bettingEndsAt,
      startedAt: record.startedAt,
      crashedAt: record.crashedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      bets: record.bets.map((bet) =>
        Bet.reconstitute({
          id: bet.id,
          roundId: bet.roundId,
          userId: bet.userId,
          username: bet.username,
          amountCents: bet.amountCents,
          status: bet.status,
          cashoutMultiplierBps: bet.cashoutMultiplierBps,
          payoutCents: bet.payoutCents,
          createdAt: bet.createdAt,
          updatedAt: bet.updatedAt,
        } satisfies BetProps),
      ),
    });
  }
}
