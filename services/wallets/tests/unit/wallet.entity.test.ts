import { describe, expect, it } from "bun:test";
import { Wallet } from "../../src/domain/entities/wallet.entity";
import {
  InsufficientBalanceError,
  InvalidAmountError,
} from "../../src/domain/errors/wallet.errors";

describe("Wallet", () => {
  it("creates wallet with initial balance", () => {
    const wallet = Wallet.create("user-1", 100_000n);

    expect(wallet.userId).toBe("user-1");
    expect(wallet.balanceCents).toBe(100_000n);
  });

  it("debits balance when sufficient funds", () => {
    const wallet = Wallet.create("user-1", 100_000n);

    wallet.debit(25_000n);

    expect(wallet.balanceCents).toBe(75_000n);
  });

  it("credits balance", () => {
    const wallet = Wallet.create("user-1", 100_000n);

    wallet.credit(50_000n);

    expect(wallet.balanceCents).toBe(150_000n);
  });

  it("rejects debit when balance is insufficient", () => {
    const wallet = Wallet.create("user-1", 100n);

    expect(() => wallet.debit(101n)).toThrow(InsufficientBalanceError);
    expect(wallet.balanceCents).toBe(100n);
  });

  it("rejects zero or negative amounts", () => {
    const wallet = Wallet.create("user-1", 100_000n);

    expect(() => wallet.debit(0n)).toThrow(InvalidAmountError);
    expect(() => wallet.debit(-1n)).toThrow(InvalidAmountError);
    expect(() => wallet.credit(0n)).toThrow(InvalidAmountError);
  });

  it("preserves monetary precision with bigint", () => {
    const wallet = Wallet.create("user-1", 1_000_000_000_000n);

    wallet.debit(999_999_999_999n);

    expect(wallet.balanceCents).toBe(1n);
  });
});
