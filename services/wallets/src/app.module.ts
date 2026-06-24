import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { ProcessWalletOperationHandler } from "./application/handlers/process-wallet-operation.handler";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { CreditWalletUseCase } from "./application/use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "./application/use-cases/debit-wallet.use-case";
import { GetWalletUseCase } from "./application/use-cases/get-wallet.use-case";
import { WALLET_REPOSITORY } from "./domain/repositories/wallet.repository.port";
import { JwtStrategy } from "./infrastructure/auth/jwt.strategy";
import { RabbitMqConnection } from "./infrastructure/messaging/rabbitmq.connection";
import { WalletEventsConsumer } from "./infrastructure/messaging/wallet-events.consumer";
import { WalletEventsPublisher } from "./infrastructure/messaging/wallet-events.publisher";
import { PrismaWalletRepository } from "./infrastructure/persistence/prisma/prisma-wallet.repository";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: "jwt" }),
  ],
  controllers: [WalletsController],
  providers: [
    PrismaService,
    JwtStrategy,
    RabbitMqConnection,
    WalletEventsPublisher,
    WalletEventsConsumer,
    ProcessWalletOperationHandler,
    CreateWalletUseCase,
    GetWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
})
export class AppModule {}
