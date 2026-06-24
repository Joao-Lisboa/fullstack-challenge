import {
  InsufficientBalanceError,
  InvalidAmountError,
} from "../errors/wallet.errors";

export interface WalletProps {
  id: string;
  userId: string;
  balanceCents: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  private constructor(private props: WalletProps) {}

  static create(userId: string, initialBalanceCents: bigint, id?: string): Wallet {
    const now = new Date();
    return new Wallet({
      id: id ?? crypto.randomUUID(),
      userId,
      balanceCents: initialBalanceCents,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: WalletProps): Wallet {
    return new Wallet({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get balanceCents(): bigint {
    return this.props.balanceCents;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  debit(amountCents: bigint): void {
    this.assertPositiveAmount(amountCents);

    if (this.props.balanceCents < amountCents) {
      throw new InsufficientBalanceError();
    }

    this.props.balanceCents -= amountCents;
    this.props.updatedAt = new Date();
  }

  credit(amountCents: bigint): void {
    this.assertPositiveAmount(amountCents);
    this.props.balanceCents += amountCents;
    this.props.updatedAt = new Date();
  }

  toProps(): WalletProps {
    return { ...this.props };
  }

  private assertPositiveAmount(amountCents: bigint): void {
    if (amountCents <= 0n) {
      throw new InvalidAmountError();
    }
  }
}
