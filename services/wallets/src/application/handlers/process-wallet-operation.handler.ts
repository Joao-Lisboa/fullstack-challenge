import { Injectable } from "@nestjs/common";
import {
  RoutingKeys,
  WalletOperationFailedEvent,
  WalletOperationRequestedEvent,
  WalletOperationResultEvent,
} from "@crash/events";
import { CreditWalletUseCase } from "../use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "../use-cases/debit-wallet.use-case";
import {
  DuplicateOperationError,
  InsufficientBalanceError,
  InvalidAmountError,
  WalletNotFoundError,
} from "../../domain/errors/wallet.errors";
import { WalletEventsPublisher } from "../../infrastructure/messaging/wallet-events.publisher";

@Injectable()
export class ProcessWalletOperationHandler {
  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
    private readonly publisher: WalletEventsPublisher,
  ) {}

  async handleBetPlaced(event: WalletOperationRequestedEvent): Promise<void> {
    await this.processOperation(event, "debit", RoutingKeys.DEBIT_COMPLETED, RoutingKeys.DEBIT_FAILED);
  }

  async handleCashoutCompleted(event: WalletOperationRequestedEvent): Promise<void> {
    await this.processOperation(
      event,
      "credit",
      RoutingKeys.CREDIT_COMPLETED,
      RoutingKeys.CREDIT_FAILED,
    );
  }

  private async processOperation(
    event: WalletOperationRequestedEvent,
    operation: "debit" | "credit",
    successRoutingKey: string,
    failureRoutingKey: string,
  ): Promise<void> {
    const amountCents = BigInt(event.amountCents);
    const input = {
      userId: event.userId,
      amountCents,
      correlationId: event.correlationId,
      idempotencyKey: event.eventId,
    };

    try {
      const wallet =
        operation === "debit"
          ? await this.debitWalletUseCase.execute(input)
          : await this.creditWalletUseCase.execute(input);

      const result: WalletOperationResultEvent = {
        eventId: crypto.randomUUID(),
        correlationId: event.correlationId,
        userId: event.userId,
        amountCents: event.amountCents,
        balanceCents: wallet.balanceCents.toString(),
        occurredAt: new Date().toISOString(),
      };

      await this.publisher.publish(successRoutingKey, result);
    } catch (error) {
      if (error instanceof DuplicateOperationError) {
        return;
      }

      const reason = this.resolveFailureReason(error);
      const failure: WalletOperationFailedEvent = {
        eventId: crypto.randomUUID(),
        correlationId: event.correlationId,
        userId: event.userId,
        amountCents: event.amountCents,
        occurredAt: new Date().toISOString(),
        reason,
      };

      await this.publisher.publish(failureRoutingKey, failure);
    }
  }

  private resolveFailureReason(error: unknown): string {
    if (error instanceof InsufficientBalanceError) {
      return "INSUFFICIENT_BALANCE";
    }

    if (error instanceof WalletNotFoundError) {
      return "WALLET_NOT_FOUND";
    }

    if (error instanceof InvalidAmountError) {
      return "INVALID_AMOUNT";
    }

    return "UNKNOWN_ERROR";
  }
}
