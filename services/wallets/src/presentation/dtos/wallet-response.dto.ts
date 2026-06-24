import { Wallet } from "../../domain/entities/wallet.entity";

export class WalletResponseDto {
  id!: string;
  userId!: string;
  balanceCents!: string;
  balance!: string;
  createdAt!: string;
  updatedAt!: string;

  static fromWallet(wallet: Wallet): WalletResponseDto {
    const balanceCents = wallet.balanceCents;

    return {
      id: wallet.id,
      userId: wallet.userId,
      balanceCents: balanceCents.toString(),
      balance: (Number(balanceCents) / 100).toFixed(2),
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }
}
