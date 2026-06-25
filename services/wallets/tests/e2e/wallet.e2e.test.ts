import { describe, expect, test } from "bun:test";
import {
  ensureWallet,
  getAccessToken,
  getWallet,
  isStackAvailable,
} from "../../../games/tests/e2e/helpers";

const stackAvailable = await isStackAvailable();

describe("Wallet API E2E", () => {
  test.skipIf(!stackAvailable)("GET /wallets/me retorna saldo do jogador autenticado", async () => {
    const token = await getAccessToken();
    const wallet = await ensureWallet(token);

    expect(wallet.balanceCents).toBeDefined();
    expect(BigInt(wallet.balanceCents)).toBeGreaterThan(0n);

    const fetched = await getWallet(token);
    expect(fetched.balanceCents).toBe(wallet.balanceCents);
  });

  test.skipIf(!stackAvailable)("POST /wallets é idempotente via GET após conflito", async () => {
    const token = await getAccessToken();
    const first = await ensureWallet(token);
    const second = await ensureWallet(token);

    expect(second.balanceCents).toBe(first.balanceCents);
  });
});
