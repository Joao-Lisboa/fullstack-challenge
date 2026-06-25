import type { Bet, Round, RoundBet } from "../types/game";

export function roundBetToBet(bet: RoundBet, roundId: string): Bet {
  return {
    id: bet.id,
    roundId,
    userId: bet.userId,
    username: bet.username,
    amountCents: bet.amountCents,
    status: bet.status,
    cashoutMultiplierBps: bet.cashoutMultiplierBps,
    payoutCents: bet.payoutCents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function findMyActiveBet(round: Round | null, userId: string, apiBets: Bet[]): Bet | null {
  if (!round || !userId) return null;

  const fromApi = apiBets.find(
    (bet) =>
      bet.roundId === round.id &&
      (bet.status === "AWAITING_DEBIT" || bet.status === "ACTIVE"),
  );
  if (fromApi) return fromApi;

  const fromRound = round.bets.find(
    (bet) =>
      bet.userId === userId &&
      (bet.status === "AWAITING_DEBIT" || bet.status === "ACTIVE"),
  );
  return fromRound ? roundBetToBet(fromRound, round.id) : null;
}

export function mergeRoundBets(round: Round | null, myBet: Bet | null): RoundBet[] {
  if (!round) return [];

  const bets = [...round.bets];
  if (!myBet || myBet.roundId !== round.id) return bets;

  const exists = bets.some((bet) => bet.id === myBet.id);
  if (exists) return bets;

  return [
    ...bets,
    {
      id: myBet.id,
      userId: myBet.userId,
      username: myBet.username,
      amountCents: myBet.amountCents,
      status: myBet.status,
      cashoutMultiplierBps: myBet.cashoutMultiplierBps,
      payoutCents: myBet.payoutCents,
    },
  ];
}

export function getPollIntervalMs(status: Round["status"] | undefined): number {
  if (status === "RUNNING") return 150;
  if (status === "BETTING") return 400;
  return 800;
}
