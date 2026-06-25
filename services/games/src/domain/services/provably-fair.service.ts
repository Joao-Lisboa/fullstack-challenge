import { createHash, createHmac } from "crypto";
import { MULTIPLIER_BASE_BPS } from "../constants/game.constants";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashSeed(seed: string): string {
  return sha256Hex(seed);
}

export function generateSeedChain(length: number, genesisSeed: string): string[] {
  const chain = [genesisSeed];

  for (let index = 1; index < length; index += 1) {
    chain.push(sha256Hex(chain[index - 1]!));
  }

  return chain;
}

export function crashPointBpsFromSeed(serverSeed: string, houseEdgeBps: number): number {
  const digest = createHmac("sha256", serverSeed).update("crash-point").digest("hex");
  const value = Number.parseInt(digest.slice(0, 13), 16);
  const e = 2 ** 52;
  let multiplier = (100 * e - value) / (e - value);
  multiplier = multiplier / 100;
  multiplier *= 1 - houseEdgeBps / 10_000;
  const crashPointBps = Math.floor(multiplier * MULTIPLIER_BASE_BPS);
  return Math.max(MULTIPLIER_BASE_BPS, crashPointBps);
}

export function verifyCrashPoint(
  serverSeed: string,
  crashPointBps: number,
  houseEdgeBps: number,
): boolean {
  return crashPointBpsFromSeed(serverSeed, houseEdgeBps) === crashPointBps;
}

export function calculatePayoutCents(amountCents: bigint, multiplierBps: number): bigint {
  return (amountCents * BigInt(multiplierBps)) / BigInt(MULTIPLIER_BASE_BPS);
}

export function applyGrowthTick(multiplierBps: number, growthFactorBps: number): number {
  return Math.floor((multiplierBps * growthFactorBps) / MULTIPLIER_BASE_BPS);
}
