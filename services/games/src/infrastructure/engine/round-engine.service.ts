import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { GAME_CONFIG } from "../../domain/constants/game.constants";
import type { RoundRepository } from "../../domain/repositories/game.repository.port";
import { ROUND_REPOSITORY } from "../../domain/repositories/game.repository.port";
import { StartNewRoundUseCase } from "../../application/use-cases/start-new-round.use-case";
import { GameRealtimeService } from "../realtime/game-realtime.service";

@Injectable()
export class RoundEngineService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RoundEngineService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly roundRepository: RoundRepository,
    private readonly startNewRoundUseCase: StartNewRoundUseCase,
    private readonly realtime: GameRealtimeService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureActiveRound();
    this.interval = setInterval(() => {
      void this.tick();
    }, GAME_CONFIG.tickIntervalMs);
    this.logger.log("Round engine started");
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async ensureActiveRound(): Promise<void> {
    const current = await this.roundRepository.findCurrent();
    if (!current || current.status === "CRASHED") {
      const round = await this.startNewRoundUseCase.execute();
      this.realtime.emitRoundBetting(round);
    }
  }

  private async tick(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      let round = await this.roundRepository.findCurrent();
      if (!round) {
        const created = await this.startNewRoundUseCase.execute();
        this.realtime.emitRoundBetting(created);
        return;
      }

      if (round.status === "BETTING" && round.isBettingExpired()) {
        round.closeBetting();
        await this.roundRepository.save(round);
        this.realtime.emitRoundRunning(round);
        this.logger.log(`Round ${round.roundNumber} started running`);
        return;
      }

      if (round.status === "RUNNING") {
        const crashed = round.tickMultiplier();
        await this.roundRepository.save(round);

        if (crashed) {
          this.realtime.emitRoundCrashed(round);
          this.logger.log(
            `Round ${round.roundNumber} crashed at ${(round.crashPointBps / 100).toFixed(2)}x`,
          );
          await new Promise((resolve) => setTimeout(resolve, 3_000));
          const nextRound = await this.startNewRoundUseCase.execute();
          this.realtime.emitRoundBetting(nextRound);
        } else {
          this.realtime.emitRoundTick(round);
        }

        return;
      }

      if (round.status === "CRASHED") {
        const nextRound = await this.startNewRoundUseCase.execute();
        this.realtime.emitRoundBetting(nextRound);
      }
    } catch (error) {
      this.logger.error("Round engine tick failed", error);
    } finally {
      this.processing = false;
    }
  }
}
