import { Injectable, Inject } from "@nestjs/common";
import { Wallet } from "../../domain/entities/wallet.entity";
import {
  DuplicateOperationError,
  WalletNotFoundError,
} from "../../domain/errors/wallet.errors";
import type { WalletRepository } from "../../domain/repositories/wallet.repository.port";
import {
  WALLET_REPOSITORY,
} from "../../domain/repositories/wallet.repository.port";

export interface CreditWalletInput {
  userId: string;
  amountCents: bigint;
  correlationId: string;
  idempotencyKey: string;
}

@Injectable()
export class CreditWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(input: CreditWalletInput): Promise<Wallet> {
    if (await this.walletRepository.hasProcessedIdempotencyKey(input.idempotencyKey)) {
      throw new DuplicateOperationError();
    }

    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet) {
      throw new WalletNotFoundError();
    }

    wallet.credit(input.amountCents);

    await this.walletRepository.recordTransaction(wallet, {
      type: "CREDIT",
      amountCents: input.amountCents,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    });

    return wallet;
  }
}
