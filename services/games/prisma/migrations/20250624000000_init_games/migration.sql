-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'RUNNING', 'CRASHED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('AWAITING_DEBIT', 'ACTIVE', 'CASHED_OUT', 'LOST');

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL,
    "server_seed" TEXT NOT NULL,
    "server_seed_hash" TEXT NOT NULL,
    "crash_point_bps" INTEGER NOT NULL,
    "current_multiplier_bps" INTEGER NOT NULL,
    "betting_ends_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "crashed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL,
    "cashout_multiplier_bps" INTEGER,
    "payout_cents" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current_round_id" UUID,
    "next_round_number" INTEGER NOT NULL DEFAULT 1,
    "genesis_seed" TEXT NOT NULL,
    "pending_server_seed" TEXT NOT NULL,

    CONSTRAINT "game_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rounds_round_number_key" ON "rounds"("round_number");

-- CreateIndex
CREATE UNIQUE INDEX "bets_round_id_user_id_key" ON "bets"("round_id", "user_id");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
