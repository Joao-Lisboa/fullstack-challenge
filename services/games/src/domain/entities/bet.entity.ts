import type { BetStatus } from "../constants/game.constants";
import { InvalidBetAmountError } from "../errors/game.errors";
import { GAME_CONFIG } from "../constants/game.constants";

export interface BetProps {
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
}

export class Bet {
  private constructor(private props: BetProps) {}

  static create(input: {
    roundId: string;
    userId: string;
    username: string;
    amountCents: bigint;
    id?: string;
  }): Bet {
    Bet.assertValidAmount(input.amountCents);
    const now = new Date();

    return new Bet({
      id: input.id ?? crypto.randomUUID(),
      roundId: input.roundId,
      userId: input.userId,
      username: input.username,
      amountCents: input.amountCents,
      status: "AWAITING_DEBIT",
      cashoutMultiplierBps: null,
      payoutCents: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: BetProps): Bet {
    return new Bet({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get roundId(): string {
    return this.props.roundId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get username(): string {
    return this.props.username;
  }

  get amountCents(): bigint {
    return this.props.amountCents;
  }

  get status(): BetStatus {
    return this.props.status;
  }

  get cashoutMultiplierBps(): number | null {
    return this.props.cashoutMultiplierBps;
  }

  get payoutCents(): bigint | null {
    return this.props.payoutCents;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  activate(): void {
    if (this.props.status !== "AWAITING_DEBIT") {
      throw new Error("Bet cannot be activated");
    }

    this.props.status = "ACTIVE";
    this.props.updatedAt = new Date();
  }

  markDebitFailed(): void {
    this.props.status = "LOST";
    this.props.updatedAt = new Date();
  }

  cashOut(multiplierBps: number, payoutCents: bigint): void {
    if (this.props.status !== "ACTIVE") {
      throw new Error("Only active bets can cash out");
    }

    this.props.status = "CASHED_OUT";
    this.props.cashoutMultiplierBps = multiplierBps;
    this.props.payoutCents = payoutCents;
    this.props.updatedAt = new Date();
  }

  markLost(): void {
    if (this.props.status !== "ACTIVE") {
      return;
    }

    this.props.status = "LOST";
    this.props.updatedAt = new Date();
  }

  toProps(): BetProps {
    return { ...this.props };
  }

  private static assertValidAmount(amountCents: bigint): void {
    if (amountCents < GAME_CONFIG.minBetCents || amountCents > GAME_CONFIG.maxBetCents) {
      throw new InvalidBetAmountError();
    }
  }
}
