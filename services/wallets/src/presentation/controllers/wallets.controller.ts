import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CreateWalletUseCase } from "../../application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "../../application/use-cases/get-wallet.use-case";
import { CurrentUser } from "../../infrastructure/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../infrastructure/auth/authenticated-user.interface";
import {
  WalletAlreadyExistsError,
  WalletNotFoundError,
} from "../../domain/errors/wallet.errors";
import { WalletResponseDto } from "../dtos/wallet-response.dto";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): { status: string; service: string } {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(AuthGuard("jwt"))
  async createWallet(@CurrentUser() user: AuthenticatedUser): Promise<WalletResponseDto> {
    try {
      const wallet = await this.createWalletUseCase.execute(user.userId);
      return WalletResponseDto.fromWallet(wallet);
    } catch (error) {
      if (error instanceof WalletAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async getMyWallet(@CurrentUser() user: AuthenticatedUser): Promise<WalletResponseDto> {
    try {
      const wallet = await this.getWalletUseCase.execute(user.userId);
      return WalletResponseDto.fromWallet(wallet);
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
