import type { Bet, Round, Wallet } from "../types/game";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchCurrentRound(token?: string): Promise<Round | null> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_URL}/games/rounds/current`, { headers });
  if (!response.ok) {
    throw new ApiError("Failed to fetch current round", response.status);
  }
  return response.json() as Promise<Round | null>;
}

export async function fetchRoundHistory(limit = 20): Promise<Round[]> {
  const response = await fetch(`${API_URL}/games/rounds/history?limit=${limit}`);
  if (!response.ok) {
    throw new ApiError("Failed to fetch round history", response.status);
  }
  return response.json() as Promise<Round[]>;
}

export async function fetchMyWallet(token: string): Promise<Wallet | null> {
  try {
    return await request<Wallet>("/wallets/me", token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createWallet(token: string): Promise<Wallet> {
  return request<Wallet>("/wallets", token, { method: "POST" });
}

export async function ensureWallet(token: string): Promise<Wallet> {
  const existing = await fetchMyWallet(token);
  if (existing) return existing;
  try {
    return await createWallet(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const wallet = await fetchMyWallet(token);
      if (wallet) return wallet;
    }
    throw error;
  }
}

export async function pollWalletUntilUpdated(
  token: string,
  previousBalanceCents: string,
  maxAttempts = 20,
  intervalMs = 350,
): Promise<Wallet> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wallet = await ensureWallet(token);
    if (wallet.balanceCents !== previousBalanceCents) {
      return wallet;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
  return ensureWallet(token);
}

export async function placeBet(token: string, amountCents: number): Promise<Bet> {
  return request<Bet>("/games/bet", token, {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });
}

export async function cashout(token: string): Promise<Bet> {
  return request<Bet>("/games/bet/cashout", token, { method: "POST" });
}

export async function fetchMyBets(token: string, limit = 20): Promise<Bet[]> {
  return request<Bet[]>(`/games/bets/me?limit=${limit}`, token);
}

export function getApiUrl(): string {
  return API_URL;
}
