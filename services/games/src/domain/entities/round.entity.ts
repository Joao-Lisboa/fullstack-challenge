import type { BetStatus, RoundStatus } from "../constants/game.constants";
import { GAME_CONFIG, MULTIPLIER_BASE_BPS } from "../constants/game.constants";
import { Bet } from "./bet.entity";
import {
  CashoutNotAllowedError,
  DuplicateBetError,
  InvalidRoundTransitionError,
  RoundNotAcceptingBetsError,
} from "../errors/game.errors";
import {
  applyGrowthTick,
  calculatePayoutCents,
  crashPointBpsFromSeed,
  hashSeed,
} from "../services/provably-fair.service";

export interface RoundProps {
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
  bets: Bet[];
}

export class Round {
  private constructor(private props: RoundProps) {}

  static createNew(roundNumber: number, serverSeed: string): Round {
    const now = new Date();
    const crashPointBps = crashPointBpsFromSeed(serverSeed, GAME_CONFIG.houseEdgeBps);

    return new Round({
      id: crypto.randomUUID(),
      roundNumber,
      status: "BETTING",
      serverSeed,
      serverSeedHash: hashSeed(serverSeed),
      crashPointBps,
      currentMultiplierBps: MULTIPLIER_BASE_BPS,
      bettingEndsAt: new Date(now.getTime() + GAME_CONFIG.bettingDurationMs),
      startedAt: null,
      crashedAt: null,
      createdAt: now,
      updatedAt: now,
      bets: [],
    });
  }

  static reconstitute(props: RoundProps): Round {
    return new Round({
      ...props,
      bets: props.bets.map((bet) => (bet instanceof Bet ? bet : Bet.reconstitute(bet))),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get roundNumber(): number {
    return this.props.roundNumber;
  }

  get status(): RoundStatus {
    return this.props.status;
  }

  get serverSeed(): string {
    return this.props.serverSeed;
  }

  get serverSeedHash(): string {
    return this.props.serverSeedHash;
  }

  get crashPointBps(): number {
    return this.props.crashPointBps;
  }

  get currentMultiplierBps(): number {
    return this.props.currentMultiplierBps;
  }

  get bettingEndsAt(): Date | null {
    return this.props.bettingEndsAt;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get crashedAt(): Date | null {
    return this.props.crashedAt;
  }

  get bets(): Bet[] {
    return [...this.props.bets];
  }

  get activeBets(): Bet[] {
    return this.props.bets.filter((bet) => bet.status === "ACTIVE" || bet.status === "AWAITING_DEBIT");
  }

  placeBet(bet: Bet): void {
    if (this.props.status !== "BETTING") {
      throw new RoundNotAcceptingBetsError();
    }

    if (this.props.bets.some((existing) => existing.userId === bet.userId)) {
      throw new DuplicateBetError();
    }

    this.props.bets.push(bet);
    this.props.updatedAt = new Date();
  }

  removeBet(betId: string): void {
    this.props.bets = this.props.bets.filter((bet) => bet.id !== betId);
    this.props.updatedAt = new Date();
  }

  findBetByUserId(userId: string): Bet | undefined {
    return this.props.bets.find((bet) => bet.userId === userId);
  }

  findBetById(betId: string): Bet | undefined {
    return this.props.bets.find((bet) => bet.id === betId);
  }

  closeBetting(): void {
    if (this.props.status !== "BETTING") {
      throw new InvalidRoundTransitionError("Only betting rounds can start running");
    }

    this.props.status = "RUNNING";
    this.props.startedAt = new Date();
    this.props.currentMultiplierBps = MULTIPLIER_BASE_BPS;
    this.props.updatedAt = new Date();
  }

  tickMultiplier(): boolean {
    if (this.props.status !== "RUNNING") {
      return false;
    }

    const nextMultiplier = applyGrowthTick(
      this.props.currentMultiplierBps,
      GAME_CONFIG.growthFactorBps,
    );

    if (nextMultiplier >= this.props.crashPointBps) {
      this.crash();
      return true;
    }

    this.props.currentMultiplierBps = nextMultiplier;
    this.props.updatedAt = new Date();
    return false;
  }

  cashOut(userId: string): { bet: Bet; payoutCents: bigint; multiplierBps: number } {
    if (this.props.status !== "RUNNING") {
      throw new CashoutNotAllowedError();
    }

    const bet = this.findBetByUserId(userId);
    if (!bet || bet.status !== "ACTIVE") {
      throw new CashoutNotAllowedError();
    }

    const payoutCents = calculatePayoutCents(bet.amountCents, this.props.currentMultiplierBps);
    bet.cashOut(this.props.currentMultiplierBps, payoutCents);
    this.props.updatedAt = new Date();

    return {
      bet,
      payoutCents,
      multiplierBps: this.props.currentMultiplierBps,
    };
  }

  crash(): void {
    if (this.props.status !== "RUNNING") {
      throw new InvalidRoundTransitionError("Only running rounds can crash");
    }

    this.props.status = "CRASHED";
    this.props.currentMultiplierBps = this.props.crashPointBps;
    this.props.crashedAt = new Date();
    this.props.updatedAt = new Date();

    for (const bet of this.props.bets) {
      if (bet.status === "ACTIVE") {
        bet.markLost();
      }
    }
  }

  isBettingExpired(now = new Date()): boolean {
    return this.props.status === "BETTING" && this.props.bettingEndsAt !== null && now >= this.props.bettingEndsAt;
  }

  toProps(): RoundProps {
    return {
      ...this.props,
      bets: this.props.bets.map((bet) => bet),
    };
  }
}
