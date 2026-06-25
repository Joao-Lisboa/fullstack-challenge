import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { WalletOperationResultHandler } from "./application/handlers/wallet-operation-result.handler";
import { CashoutUseCase } from "./application/use-cases/cashout.use-case";
import { GetCurrentRoundUseCase, GetRoundHistoryUseCase } from "./application/use-cases/get-rounds.use-case";
import { GetMyBetsUseCase } from "./application/use-cases/get-my-bets.use-case";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { StartNewRoundUseCase } from "./application/use-cases/start-new-round.use-case";
import { VerifyRoundUseCase } from "./application/use-cases/verify-round.use-case";
import {
  BET_REPOSITORY,
  GAME_STATE_REPOSITORY,
  ROUND_REPOSITORY,
} from "./domain/repositories/game.repository.port";
import { JwtAuthService } from "./infrastructure/auth/jwt-auth.service";
import { JwtStrategy } from "./infrastructure/auth/jwt.strategy";
import { RoundEngineService } from "./infrastructure/engine/round-engine.service";
import { GameEventsPublisher } from "./infrastructure/messaging/game-events.publisher";
import { RabbitMqConnection } from "./infrastructure/messaging/rabbitmq.connection";
import { WalletResultsConsumer } from "./infrastructure/messaging/wallet-results.consumer";
import { PrismaBetRepository } from "./infrastructure/persistence/prisma/prisma-bet.repository";
import { PrismaGameStateRepository } from "./infrastructure/persistence/prisma/prisma-game-state.repository";
import { PrismaRoundRepository } from "./infrastructure/persistence/prisma/prisma-round.repository";
import { PrismaService } from "./infrastructure/persistence/prisma/prisma.service";
import { GameRealtimeService } from "./infrastructure/realtime/game-realtime.service";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: "jwt" }),
  ],
  controllers: [GamesController],
  providers: [
    PrismaService,
    JwtAuthService,
    JwtStrategy,
    RabbitMqConnection,
    GameEventsPublisher,
    WalletResultsConsumer,
    GameRealtimeService,
    GameGateway,
    RoundEngineService,
    StartNewRoundUseCase,
    PlaceBetUseCase,
    CashoutUseCase,
    VerifyRoundUseCase,
    GetCurrentRoundUseCase,
    GetRoundHistoryUseCase,
    GetMyBetsUseCase,
    WalletOperationResultHandler,
    {
      provide: ROUND_REPOSITORY,
      useClass: PrismaRoundRepository,
    },
    {
      provide: GAME_STATE_REPOSITORY,
      useClass: PrismaGameStateRepository,
    },
    {
      provide: BET_REPOSITORY,
      useClass: PrismaBetRepository,
    },
  ],
})
export class AppModule {}
