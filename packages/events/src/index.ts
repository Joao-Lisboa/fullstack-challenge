export const EXCHANGE = "crash.events";

export const RoutingKeys = {
  BET_PLACED: "game.bet.placed",
  CASHOUT_COMPLETED: "game.cashout.completed",
  DEBIT_COMPLETED: "wallet.debit.completed",
  DEBIT_FAILED: "wallet.debit.failed",
  CREDIT_COMPLETED: "wallet.credit.completed",
  CREDIT_FAILED: "wallet.credit.failed",
} as const;

export type WalletOperationType = "debit" | "credit";

export interface WalletOperationRequestedEvent {
  eventId: string;
  correlationId: string;
  userId: string;
  amountCents: string;
  occurredAt: string;
}

export interface WalletOperationResultEvent {
  eventId: string;
  correlationId: string;
  userId: string;
  amountCents: string;
  balanceCents: string;
  occurredAt: string;
  reason?: string;
}

export interface WalletOperationFailedEvent {
  eventId: string;
  correlationId: string;
  userId: string;
  amountCents: string;
  occurredAt: string;
  reason: string;
}
