import { describe, expect, it } from "bun:test";
import { Bet } from "../../src/domain/entities/bet.entity";
import { Round } from "../../src/domain/entities/round.entity";
import { MULTIPLIER_BASE_BPS } from "../../src/domain/constants/game.constants";
import {
  CashoutNotAllowedError,
  DuplicateBetError,
  InvalidBetAmountError,
  RoundNotAcceptingBetsError,
} from "../../src/domain/errors/game.errors";
import {
  calculatePayoutCents,
  crashPointBpsFromSeed,
  generateSeedChain,
  hashSeed,
  verifyCrashPoint,
} from "../../src/domain/services/provably-fair.service";

describe("ProvablyFair", () => {
  it("generates deterministic crash point from seed", () => {
    const seed = "server-seed-123";
    const first = crashPointBpsFromSeed(seed, 100);
    const second = crashPointBpsFromSeed(seed, 100);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(MULTIPLIER_BASE_BPS);
  });

  it("verifies crash point against seed", () => {
    const seed = "verify-seed";
    const crashPointBps = crashPointBpsFromSeed(seed, 100);

    expect(verifyCrashPoint(seed, crashPointBps, 100)).toBe(true);
    expect(verifyCrashPoint(seed, crashPointBps + 1, 100)).toBe(false);
  });

  it("builds hash chain for future rounds", () => {
    const chain = generateSeedChain(3, "genesis");

    expect(chain).toHaveLength(3);
    expect(chain[1]).toBe(hashSeed("genesis"));
    expect(chain[2]).toBe(hashSeed(chain[1]!));
  });

  it("calculates payout without floating point money", () => {
    const payout = calculatePayoutCents(10_000n, 25_000);

    expect(payout).toBe(25_000n);
  });
});

describe("Round lifecycle", () => {
  const seed = "round-seed";

  it("starts in BETTING with hashed seed published", () => {
    const round = Round.createNew(1, seed);

    expect(round.status).toBe("BETTING");
    expect(round.serverSeedHash).toBe(hashSeed(seed));
    expect(round.crashPointBps).toBe(crashPointBpsFromSeed(seed, 100));
  });

  it("accepts one bet per player during betting", () => {
    const round = Round.createNew(1, seed);
    const bet = Bet.create({
      roundId: round.id,
      userId: "user-1",
      username: "player",
      amountCents: 1_000n,
    });

    round.placeBet(bet);

    expect(round.bets).toHaveLength(1);
    expect(() =>
      round.placeBet(
        Bet.create({
          roundId: round.id,
          userId: "user-1",
          username: "player",
          amountCents: 2_000n,
        }),
      ),
    ).toThrow(DuplicateBetError);
  });

  it("rejects invalid bet amounts", () => {
    expect(() =>
      Bet.create({
        roundId: "round",
        userId: "user-1",
        username: "player",
        amountCents: 50n,
      }),
    ).toThrow(InvalidBetAmountError);
  });

  it("transitions to RUNNING and allows cashout", () => {
    const round = Round.createNew(1, seed);
    const bet = Bet.create({
      roundId: round.id,
      userId: "user-1",
      username: "player",
      amountCents: 10_000n,
    });

    round.placeBet(bet);
    bet.activate();
    round.closeBetting();

    const result = round.cashOut("user-1");

    expect(round.status).toBe("RUNNING");
    expect(result.bet.status).toBe("CASHED_OUT");
    expect(result.payoutCents).toBeGreaterThan(0n);
  });

  it("crashes and marks active bets as lost", () => {
    const round = Round.createNew(1, seed);
    const bet = Bet.create({
      roundId: round.id,
      userId: "user-1",
      username: "player",
      amountCents: 10_000n,
    });

    round.placeBet(bet);
    bet.activate();
    round.closeBetting();
    round.crash();

    expect(round.status).toBe("CRASHED");
    expect(bet.status).toBe("LOST");
  });

  it("rejects bets outside betting phase", () => {
    const round = Round.createNew(1, seed);
    round.closeBetting();

    expect(() =>
      round.placeBet(
        Bet.create({
          roundId: round.id,
          userId: "user-1",
          username: "player",
          amountCents: 1_000n,
        }),
      ),
    ).toThrow(RoundNotAcceptingBetsError);
  });

  it("rejects cashout without active bet", () => {
    const round = Round.createNew(1, seed);
    round.closeBetting();

    expect(() => round.cashOut("user-1")).toThrow(CashoutNotAllowedError);
  });
});
