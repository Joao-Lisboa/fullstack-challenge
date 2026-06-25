const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";
const REALM = "crash-game";
const CLIENT_ID = "crash-game-client";

export interface RoundSnapshot {
  id: string;
  status: "BETTING" | "RUNNING" | "CRASHED";
  currentMultiplierBps: number;
  bettingEndsAt: string | null;
}

export interface WalletSnapshot {
  balanceCents: string;
}

export interface BetSnapshot {
  id: string;
  status: string;
  amountCents: string;
  payoutCents: string | null;
}

export async function isStackAvailable(): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/games/health`, { signal: AbortSignal.timeout(5_000) });
      const wallets = await fetch(`${API_URL}/wallets/health`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok && wallets.ok) {
        return true;
      }
    } catch {
      // retry
    }
    await sleep(1_000);
  }
  return false;
}

export async function getAccessToken(
  username = "player",
  password = "player123",
): Promise<string> {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: CLIENT_ID,
      username,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain token: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function authFetch<T>(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function ensureWallet(token: string): Promise<WalletSnapshot> {
  const createResponse = await authFetch(token, "/wallets", { method: "POST" });
  if (createResponse.ok) {
    return (await createResponse.json()) as WalletSnapshot;
  }

  const meResponse = await authFetch(token, "/wallets/me");
  if (!meResponse.ok) {
    throw new Error(`Unable to ensure wallet: ${meResponse.status} ${await meResponse.text()}`);
  }

  return (await meResponse.json()) as WalletSnapshot;
}

export async function getWallet(token: string): Promise<WalletSnapshot> {
  const response = await authFetch(token, "/wallets/me");
  if (!response.ok) {
    throw new Error(`GET /wallets/me failed: ${response.status}`);
  }
  return (await response.json()) as WalletSnapshot;
}

export async function getCurrentRound(): Promise<RoundSnapshot | null> {
  const response = await fetch(`${API_URL}/games/rounds/current`);
  if (!response.ok) {
    throw new Error(`GET /games/rounds/current failed: ${response.status}`);
  }
  return (await response.json()) as RoundSnapshot | null;
}

export async function placeBet(token: string, amountCents: number): Promise<Response> {
  return authFetch(token, "/games/bet", {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });
}

export async function getMyBets(token: string): Promise<BetSnapshot[]> {
  const response = await authFetch(token, "/games/bets/me?limit=5");
  if (!response.ok) {
    throw new Error(`GET /games/bets/me failed: ${response.status}`);
  }
  return (await response.json()) as BetSnapshot[];
}

export async function cashout(token: string): Promise<Response> {
  return authFetch(token, "/games/bet/cashout", { method: "POST" });
}

export async function waitForRoundStatus(
  status: RoundSnapshot["status"],
  timeoutMs = 30_000,
): Promise<RoundSnapshot> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const round = await getCurrentRound();
    if (round?.status === status) {
      return round;
    }
    await sleep(150);
  }

  throw new Error(`Timed out waiting for round status ${status}`);
}

export async function waitForCleanBettingPhase(token: string, timeoutMs = 120_000): Promise<RoundSnapshot> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const round = await getCurrentRound();
    if (round?.status === "BETTING" && round.bettingEndsAt) {
      const remainingMs = new Date(round.bettingEndsAt).getTime() - Date.now();
      if (remainingMs > 2_500) {
        const bets = await getMyBets(token);
        const hasOpenBet = bets.some(
          (bet) => bet.status === "ACTIVE" || bet.status === "AWAITING_DEBIT",
        );
        if (!hasOpenBet) {
          return round;
        }
      }
    }
    await sleep(200);
  }

  throw new Error("Timed out waiting for clean betting phase");
}

export async function waitForWalletChange(
  token: string,
  previousBalanceCents: string,
  timeoutMs = 15_000,
): Promise<WalletSnapshot> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const wallet = await getWallet(token);
    if (wallet.balanceCents !== previousBalanceCents) {
      return wallet;
    }
    await sleep(200);
  }

  throw new Error("Timed out waiting for wallet balance update");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
