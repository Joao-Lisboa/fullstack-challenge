import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import type { WalletRepository } from "../../domain/repositories/wallet.repository.port";
import { WALLET_REPOSITORY } from "../../domain/repositories/wallet.repository.port";

@Injectable()
export class WalletBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(WalletBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly createWalletUseCase: CreateWalletUseCase,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const userId = this.configService.get<string>("PLAYER_SEED_USER_ID");
    if (!userId) {
      return;
    }

    const exists = await this.walletRepository.existsByUserId(userId);
    if (exists) {
      return;
    }

    await this.createWalletUseCase.execute(userId);
    this.logger.log(`Carteira inicial criada para usuário de teste (${userId})`);
  }
}
