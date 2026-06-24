import { Injectable, Inject } from "@nestjs/common";
import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletNotFoundError } from "../../domain/errors/wallet.errors";
import type { WalletRepository } from "../../domain/repositories/wallet.repository.port";
import {
  WALLET_REPOSITORY,
} from "../../domain/repositories/wallet.repository.port";

@Injectable()
export class GetWalletUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new WalletNotFoundError();
    }

    return wallet;
  }
}
