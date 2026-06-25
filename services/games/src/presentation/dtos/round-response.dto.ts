import { Round } from "../../domain/entities/round.entity";

export class RoundResponseDto {
  id!: string;
  roundNumber!: number;
  status!: string;
  serverSeedHash!: string;
  crashPointBps!: number | null;
  currentMultiplierBps!: number;
  bettingEndsAt!: string | null;
  startedAt!: string | null;
  crashedAt!: string | null;
  bets!: Array<{
    id: string;
    userId: string;
    username: string;
    amountCents: string;
    status: string;
    cashoutMultiplierBps: number | null;
    payoutCents: string | null;
  }>;

  static fromRound(round: Round): RoundResponseDto {
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      crashPointBps: round.status === "CRASHED" ? round.crashPointBps : null,
      currentMultiplierBps: round.currentMultiplierBps,
      bettingEndsAt: round.bettingEndsAt?.toISOString() ?? null,
      startedAt: round.startedAt?.toISOString() ?? null,
      crashedAt: round.crashedAt?.toISOString() ?? null,
      bets: round.bets.map((bet) => ({
        id: bet.id,
        userId: bet.userId,
        username: bet.username,
        amountCents: bet.amountCents.toString(),
        status: bet.status,
        cashoutMultiplierBps: bet.cashoutMultiplierBps,
        payoutCents: bet.payoutCents?.toString() ?? null,
      })),
    };
  }
}
