import { Bet } from "../../domain/entities/bet.entity";

export class BetResponseDto {
  id!: string;
  roundId!: string;
  userId!: string;
  username!: string;
  amountCents!: string;
  status!: string;
  cashoutMultiplierBps!: number | null;
  payoutCents!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static fromBet(bet: Bet): BetResponseDto {
    return {
      id: bet.id,
      roundId: bet.roundId,
      userId: bet.userId,
      username: bet.username,
      amountCents: bet.amountCents.toString(),
      status: bet.status,
      cashoutMultiplierBps: bet.cashoutMultiplierBps,
      payoutCents: bet.payoutCents?.toString() ?? null,
      createdAt: bet.createdAt.toISOString(),
      updatedAt: bet.updatedAt.toISOString(),
    };
  }
}
