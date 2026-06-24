import { Injectable, Inject } from "@nestjs/common";
import { Wallet } from "../../domain/entities/wallet.entity";
import {
  INITIAL_BALANCE_CENTS,
  WalletAlreadyExistsError,
} from "../../domain/errors/wallet.errors";
import type { WalletRepository } from "../../domain/repositories/wallet.repository.port";
import {
  WALLET_REPOSITORY,
} from "../../domain/repositories/wallet.repository.port";

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(userId: string): Promise<Wallet> {
    const exists = await this.walletRepository.existsByUserId(userId);
    if (exists) {
      throw new WalletAlreadyExistsError();
    }

    const wallet = Wallet.create(userId, INITIAL_BALANCE_CENTS);
    await this.walletRepository.save(wallet);
    return wallet;
  }
}
