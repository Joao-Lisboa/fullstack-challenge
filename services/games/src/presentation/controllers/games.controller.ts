import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CashoutUseCase } from "../../application/use-cases/cashout.use-case";
import { GetCurrentRoundUseCase, GetRoundHistoryUseCase } from "../../application/use-cases/get-rounds.use-case";
import { GetMyBetsUseCase } from "../../application/use-cases/get-my-bets.use-case";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { VerifyRoundUseCase } from "../../application/use-cases/verify-round.use-case";
import {
  CashoutNotAllowedError,
  DuplicateBetError,
  InvalidBetAmountError,
  RoundNotAcceptingBetsError,
} from "../../domain/errors/game.errors";
import { CurrentUser } from "../../infrastructure/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../infrastructure/auth/authenticated-user.interface";
import { BetResponseDto } from "../dtos/bet-response.dto";
import { PlaceBetDto } from "../dtos/place-bet.dto";
import { RoundResponseDto } from "../dtos/round-response.dto";

@Controller()
export class GamesController {
  constructor(
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly getRoundHistoryUseCase: GetRoundHistoryUseCase,
    private readonly verifyRoundUseCase: VerifyRoundUseCase,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutUseCase: CashoutUseCase,
    private readonly getMyBetsUseCase: GetMyBetsUseCase,
  ) {}

  @Get("health")
  check(): { status: string; service: string } {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  async getCurrentRound(): Promise<RoundResponseDto | null> {
    const round = await this.getCurrentRoundUseCase.execute();
    return round ? RoundResponseDto.fromRound(round) : null;
  }

  @Get("rounds/history")
  async getHistory(
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ): Promise<RoundResponseDto[]> {
    const rounds = await this.getRoundHistoryUseCase.execute(Number(limit), Number(offset));
    return rounds.map((round) => RoundResponseDto.fromRound(round));
  }

  @Get("rounds/:roundId/verify")
  async verifyRound(@Param("roundId") roundId: string) {
    const result = await this.verifyRoundUseCase.execute(roundId);
    if (!result) {
      throw new NotFoundException("Round not found");
    }

    return result;
  }

  @Post("bet")
  @UseGuards(AuthGuard("jwt"))
  async placeBet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaceBetDto,
  ): Promise<BetResponseDto> {
    try {
      const { bet } = await this.placeBetUseCase.execute({
        userId: user.userId,
        username: user.username,
        amountCents: BigInt(body.amountCents),
      });

      return BetResponseDto.fromBet(bet);
    } catch (error) {
      if (error instanceof RoundNotAcceptingBetsError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof DuplicateBetError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof InvalidBetAmountError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post("bet/cashout")
  @UseGuards(AuthGuard("jwt"))
  async cashout(@CurrentUser() user: AuthenticatedUser): Promise<BetResponseDto> {
    try {
      const { bet } = await this.cashoutUseCase.execute(user.userId);
      return BetResponseDto.fromBet(bet);
    } catch (error) {
      if (error instanceof CashoutNotAllowedError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Get("bets/me")
  @UseGuards(AuthGuard("jwt"))
  async getMyBets(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ): Promise<BetResponseDto[]> {
    const bets = await this.getMyBetsUseCase.execute(user.userId, Number(limit), Number(offset));
    return bets.map((bet) => BetResponseDto.fromBet(bet));
  }
}
