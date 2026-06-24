import { describe, expect, it } from "bun:test";
import { Wallet } from "../../src/domain/entities/wallet.entity";
import { DebitWalletUseCase } from "../../src/application/use-cases/debit-wallet.use-case";
import { CreditWalletUseCase } from "../../src/application/use-cases/credit-wallet.use-case";
import {
  DuplicateOperationError,
  InsufficientBalanceError,
  WalletNotFoundError,
} from "../../src/domain/errors/wallet.errors";
import type {
  WalletRepository,
  WalletTransactionRecord,
} from "../../src/domain/repositories/wallet.repository.port";

class InMemoryWalletRepository implements WalletRepository {
  private wallets = new Map<string, Wallet>();
  private idempotencyKeys = new Set<string>();

  seed(wallet: Wallet): void {
    this.wallets.set(wallet.userId, wallet);
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.wallets.get(userId) ?? null;
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.userId, wallet);
  }

  async existsByUserId(userId: string): Promise<boolean> {
    return this.wallets.has(userId);
  }

  async hasProcessedIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    return this.idempotencyKeys.has(idempotencyKey);
  }

  async recordTransaction(
    wallet: Wallet,
    transaction: Omit<WalletTransactionRecord, "id" | "createdAt" | "walletId">,
  ): Promise<void> {
    this.idempotencyKeys.add(transaction.idempotencyKey);
    this.wallets.set(wallet.userId, wallet);
  }
}

describe("DebitWalletUseCase", () => {
  it("debits wallet and records idempotency", async () => {
    const repository = new InMemoryWalletRepository();
    repository.seed(Wallet.create("user-1", 100_000n));
    const useCase = new DebitWalletUseCase(repository);

    const wallet = await useCase.execute({
      userId: "user-1",
      amountCents: 10_000n,
      correlationId: "bet-1",
      idempotencyKey: "evt-1",
    });

    expect(wallet.balanceCents).toBe(90_000n);
  });

  it("rejects duplicate operations", async () => {
    const repository = new InMemoryWalletRepository();
    repository.seed(Wallet.create("user-1", 100_000n));
    const useCase = new DebitWalletUseCase(repository);

    await useCase.execute({
      userId: "user-1",
      amountCents: 10_000n,
      correlationId: "bet-1",
      idempotencyKey: "evt-1",
    });

    await expect(
      useCase.execute({
        userId: "user-1",
        amountCents: 10_000n,
        correlationId: "bet-1",
        idempotencyKey: "evt-1",
      }),
    ).rejects.toThrow(DuplicateOperationError);
  });

  it("rejects when wallet is missing", async () => {
    const useCase = new DebitWalletUseCase(new InMemoryWalletRepository());

    await expect(
      useCase.execute({
        userId: "missing",
        amountCents: 10_000n,
        correlationId: "bet-1",
        idempotencyKey: "evt-1",
      }),
    ).rejects.toThrow(WalletNotFoundError);
  });

  it("rejects insufficient balance", async () => {
    const repository = new InMemoryWalletRepository();
    repository.seed(Wallet.create("user-1", 100n));
    const useCase = new DebitWalletUseCase(repository);

    await expect(
      useCase.execute({
        userId: "user-1",
        amountCents: 101n,
        correlationId: "bet-1",
        idempotencyKey: "evt-1",
      }),
    ).rejects.toThrow(InsufficientBalanceError);
  });
});

describe("CreditWalletUseCase", () => {
  it("credits wallet balance", async () => {
    const repository = new InMemoryWalletRepository();
    repository.seed(Wallet.create("user-1", 100_000n));
    const useCase = new CreditWalletUseCase(repository);

    const wallet = await useCase.execute({
      userId: "user-1",
      amountCents: 25_000n,
      correlationId: "cashout-1",
      idempotencyKey: "evt-2",
    });

    expect(wallet.balanceCents).toBe(125_000n);
  });
});
