import { Injectable } from "@nestjs/common";
import { Wallet } from "../../../domain/entities/wallet.entity";
import type {
  WalletRepository,
  WalletTransactionRecord,
} from "../../../domain/repositories/wallet.repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Wallet | null> {
    const record = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!record) {
      return null;
    }

    return Wallet.reconstitute({
      id: record.id,
      userId: record.userId,
      balanceCents: record.balanceCents,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async save(wallet: Wallet): Promise<void> {
    const props = wallet.toProps();

    await this.prisma.wallet.upsert({
      where: { userId: props.userId },
      create: {
        id: props.id,
        userId: props.userId,
        balanceCents: props.balanceCents,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
      update: {
        balanceCents: props.balanceCents,
        updatedAt: props.updatedAt,
      },
    });
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.wallet.count({ where: { userId } });
    return count > 0;
  }

  async hasProcessedIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    const count = await this.prisma.walletTransaction.count({
      where: { idempotencyKey },
    });
    return count > 0;
  }

  async recordTransaction(
    wallet: Wallet,
    transaction: Omit<WalletTransactionRecord, "id" | "createdAt" | "walletId">,
  ): Promise<void> {
    const props = wallet.toProps();

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: props.id },
        data: {
          balanceCents: props.balanceCents,
          updatedAt: props.updatedAt,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: props.id,
          type: transaction.type,
          amountCents: transaction.amountCents,
          correlationId: transaction.correlationId,
          idempotencyKey: transaction.idempotencyKey,
        },
      }),
    ]);
  }
}
