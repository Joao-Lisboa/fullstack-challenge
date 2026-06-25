import { describe, expect, test } from "bun:test";
import {
  cashout,
  ensureWallet,
  getAccessToken,
  getCurrentRound,
  getWallet,
  isStackAvailable,
  placeBet,
  waitForCleanBettingPhase,
  waitForRoundStatus,
  waitForWalletChange,
  sleep,
} from "./helpers";

const stackAvailable = await isStackAvailable();

describe("Game API E2E", () => {
  test.skipIf(!stackAvailable)("apostar → rodada ativa → cashout → saldo atualizado", async () => {
    const token = await getAccessToken();
    await ensureWallet(token);

    const balanceBefore = (await getWallet(token)).balanceCents;
    await waitForCleanBettingPhase(token, 120_000);

    const betResponse = await placeBet(token, 1_000);
    expect(betResponse.ok).toBe(true);

    const afterDebit = await waitForWalletChange(token, balanceBefore, 20_000);
    expect(BigInt(afterDebit.balanceCents)).toBe(BigInt(balanceBefore) - 1_000n);

    await waitForRoundStatus("RUNNING", 15_000);

    const cashoutResponse = await cashout(token);
    expect(cashoutResponse.ok).toBe(true);

    const walletAfter = await waitForWalletChange(token, afterDebit.balanceCents, 20_000);
    expect(BigInt(walletAfter.balanceCents)).toBeGreaterThan(BigInt(afterDebit.balanceCents));
  }, 120_000);

  test.skipIf(!stackAvailable)("apostar → crash → aposta perdida", async () => {
    const token = await getAccessToken();
    await ensureWallet(token);

    const balanceBefore = BigInt((await getWallet(token)).balanceCents);
    await waitForCleanBettingPhase(token, 120_000);

    const betResponse = await placeBet(token, 500);
    expect(betResponse.ok).toBe(true);

    const afterBet = await waitForWalletChange(token, balanceBefore.toString(), 20_000);
    expect(BigInt(afterBet.balanceCents)).toBe(balanceBefore - 500n);

    await waitForRoundStatus("RUNNING", 15_000);
    await waitForRoundStatus("CRASHED", 90_000);

    const finalWallet = await getWallet(token);
    expect(BigInt(finalWallet.balanceCents)).toBe(balanceBefore - 500n);
  }, 120_000);

  test.skipIf(!stackAvailable)("rejeita aposta duplicada na mesma rodada", async () => {
    const token = await getAccessToken();
    await ensureWallet(token);
    await waitForCleanBettingPhase(token, 120_000);

    const first = await placeBet(token, 500);
    expect(first.ok).toBe(true);

    const second = await placeBet(token, 500);
    expect(second.status).toBe(409);
  }, 120_000);

  test.skipIf(!stackAvailable)("rejeita aposta durante rodada ativa", async () => {
    const token = await getAccessToken();
    await ensureWallet(token);

    await waitForCleanBettingPhase(token, 120_000);
    const first = await placeBet(token, 500);
    expect(first.ok).toBe(true);

    await waitForRoundStatus("RUNNING", 15_000);

    const duringRunning = await placeBet(token, 500);
    expect(duringRunning.status).toBe(400);
  }, 120_000);

  test.skipIf(!stackAvailable)("rejeita aposta por saldo insuficiente (saga assíncrona)", async () => {
    const token = await getAccessToken();
    const wallet = await ensureWallet(token);
    const balance = BigInt(wallet.balanceCents);

    await waitForCleanBettingPhase(token, 120_000);

    const response = await placeBet(token, Number(balance + 100n));
    expect(response.ok).toBe(true);

    await sleep(3_000);

    const walletAfter = await getWallet(token);
    expect(BigInt(walletAfter.balanceCents)).toBe(balance);
  }, 120_000);

  test.skipIf(!stackAvailable)("GET /games/rounds/current retorna rodada pública", async () => {
    const round = await getCurrentRound();
    expect(round).not.toBeNull();
    expect(["BETTING", "RUNNING", "CRASHED"]).toContain(round!.status);
  });
});
