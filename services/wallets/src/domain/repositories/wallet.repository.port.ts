import { Wallet } from "../entities/wallet.entity";

export type TransactionType = "DEBIT" | "CREDIT";

export interface WalletTransactionRecord {
  id: string;
  walletId: string;
  type: TransactionType;
  amountCents: bigint;
  correlationId: string;
  idempotencyKey: string;
  createdAt: Date;
}

export interface WalletRepository {
  findByUserId(userId: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  existsByUserId(userId: string): Promise<boolean>;
  hasProcessedIdempotencyKey(idempotencyKey: string): Promise<boolean>;
  recordTransaction(
    wallet: Wallet,
    transaction: Omit<WalletTransactionRecord, "id" | "createdAt" | "walletId">,
  ): Promise<void>;
}

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
