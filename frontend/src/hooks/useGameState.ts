import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  cashout,
  ensureWallet,
  fetchCurrentRound,
  fetchRoundHistory,
  getApiUrl,
  placeBet,
  pollWalletUntilUpdated,
  ApiError,
} from "../lib/api";
import { findMyActiveBet, getPollIntervalMs } from "../lib/game-state";
import type {
  Bet,
  BetEventPayload,
  BetRemovedPayload,
  Round,
  RoundRunningPayload,
  RoundTickPayload,
  Wallet,
} from "../types/game";
import { WS_EVENTS } from "../types/game";
import { useToast } from "./useToast";

interface UseGameStateOptions {
  accessToken: string;
  getAccessToken: () => string | null;
  userId: string;
  onUnauthorized?: () => void;
}

export function useGameState({
  accessToken,
  getAccessToken,
  userId,
  onUnauthorized,
}: UseGameStateOptions) {
  const { showToast } = useToast();
  const [round, setRound] = useState<Round | null>(null);
  const [history, setHistory] = useState<Round[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const roundRef = useRef<Round | null>(null);
  const walletRef = useRef<Wallet | null>(null);
  const wsErrorShownRef = useRef(false);
  const pendingCreditRef = useRef(false);
  const sessionLockedRef = useRef(false);
  const getAccessTokenRef = useRef(getAccessToken);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const bootstrapTokenRef = useRef<string | null>(null);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const requireToken = useCallback((): string => {
    const token = getAccessTokenRef.current();
    if (!token) {
      throw new ApiError("Unauthorized", 401);
    }
    return token;
  }, []);

  const handleAuthError = useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof ApiError) || error.status !== 401) {
        return false;
      }

      if (!sessionLockedRef.current) {
        sessionLockedRef.current = true;
        showToast("Sessão expirada. Faça login novamente.", "error");
        onUnauthorizedRef.current?.();
      }
      return true;
    },
    [showToast],
  );

  const refreshWallet = useCallback(async () => {
    if (sessionLockedRef.current) return null;
    try {
      const nextWallet = await ensureWallet(requireToken());
      setWallet(nextWallet);
      return nextWallet;
    } catch (error) {
      handleAuthError(error);
      return null;
    }
  }, [handleAuthError, requireToken]);

  const waitForWalletCredit = useCallback(
    async (previousBalanceCents?: string) => {
      if (sessionLockedRef.current) return null;
      const baseline = previousBalanceCents ?? walletRef.current?.balanceCents ?? "0";
      pendingCreditRef.current = true;
      try {
        const updated = await pollWalletUntilUpdated(requireToken(), baseline);
        setWallet(updated);
        return updated;
      } catch (error) {
        handleAuthError(error);
        return null;
      } finally {
        pendingCreditRef.current = false;
      }
    },
    [handleAuthError, requireToken],
  );

  const syncFromServer = useCallback(async () => {
    if (sessionLockedRef.current) return null;

    try {
      const token = getAccessTokenRef.current() ?? undefined;
      const currentRound = await fetchCurrentRound(token);

      if (currentRound) {
        const previous = roundRef.current;
        if (previous?.id === currentRound.id && previous.status === "RUNNING" && currentRound.status === "CRASHED") {
          setCrashed(true);
          window.setTimeout(() => setCrashed(false), 1200);
          setHistory((current) => {
            const filtered = current.filter((item) => item.id !== currentRound.id);
            return [currentRound, ...filtered].slice(0, 20);
          });
          if (pendingCreditRef.current) {
            void waitForWalletCredit();
          } else if (token) {
            void refreshWallet();
          }
        } else if (previous?.id !== currentRound.id && currentRound.status === "BETTING") {
          setMyBet(null);
          if (pendingCreditRef.current) {
            void waitForWalletCredit();
          }
        }

        setRound(currentRound);
      }

      setMyBet(findMyActiveBet(currentRound, userId, []));
      return currentRound;
    } catch (error) {
      handleAuthError(error);
      return null;
    }
  }, [handleAuthError, refreshWallet, userId, waitForWalletCredit]);

  useEffect(() => {
    if (bootstrapTokenRef.current === accessToken) return;
    bootstrapTokenRef.current = accessToken;
    sessionLockedRef.current = false;

    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        const [roundHistory, nextWallet] = await Promise.all([
          fetchRoundHistory(20),
          ensureWallet(requireToken()),
        ]);

        if (cancelled) return;

        setHistory(roundHistory);
        setWallet(nextWallet);
        await syncFromServer();
      } catch (error) {
        if (!cancelled) {
          handleAuthError(error);
          if (!(error instanceof ApiError && error.status === 401)) {
            showToast(error instanceof Error ? error.message : "Erro ao carregar jogo", "error");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [accessToken, handleAuthError, requireToken, showToast, syncFromServer]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const schedulePoll = () => {
      const delay = getPollIntervalMs(roundRef.current?.status);
      timer = window.setTimeout(async () => {
        if (!active || sessionLockedRef.current) return;
        await syncFromServer();
        if (active && !sessionLockedRef.current) {
          schedulePoll();
        }
      }, delay);
    };

    schedulePoll();

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [accessToken, syncFromServer]);

  useEffect(() => {
    if (!accessToken || sessionLockedRef.current) return;

    const socket = io(getApiUrl(), {
      path: "/games/ws",
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: !sessionLockedRef.current,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      wsErrorShownRef.current = false;
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on(WS_EVENTS.ROUND_SYNC, (payload: Round | null) => {
      if (payload) setRound(payload);
      setCrashed(false);
    });

    socket.on(WS_EVENTS.ROUND_BETTING, (payload: Round) => {
      setRound(payload);
      setCrashed(false);
      setMyBet((current) => (current?.roundId === payload.id ? current : null));
      if (pendingCreditRef.current) void waitForWalletCredit();
    });

    socket.on(WS_EVENTS.ROUND_RUNNING, (payload: RoundRunningPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? {
              ...current,
              status: "RUNNING",
              currentMultiplierBps: payload.currentMultiplierBps,
              startedAt: payload.startedAt,
            }
          : current,
      );
    });

    socket.on(WS_EVENTS.ROUND_TICK, (payload: RoundTickPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? { ...current, currentMultiplierBps: payload.currentMultiplierBps }
          : current,
      );
    });

    socket.on(WS_EVENTS.ROUND_CRASHED, (payload: Round) => {
      setRound(payload);
      setCrashed(true);
      setHistory((current) => {
        const filtered = current.filter((item) => item.id !== payload.id);
        return [payload, ...filtered].slice(0, 20);
      });
      setMyBet(null);
      window.setTimeout(() => setCrashed(false), 1200);
      if (pendingCreditRef.current) {
        void waitForWalletCredit();
      } else {
        void refreshWallet();
      }
    });

    socket.on(WS_EVENTS.BET_PLACED, (payload: BetEventPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? { ...current, bets: upsertBet(current.bets, payload.bet) }
          : current,
      );
      if (payload.bet.userId === userId) setMyBet(payload.bet);
    });

    socket.on(WS_EVENTS.BET_ACTIVATED, (payload: BetEventPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? { ...current, bets: upsertBet(current.bets, payload.bet) }
          : current,
      );
      if (payload.bet.userId === userId) setMyBet(payload.bet);
    });

    socket.on(WS_EVENTS.BET_CASHED_OUT, (payload: BetEventPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? { ...current, bets: upsertBet(current.bets, payload.bet) }
          : current,
      );
      if (payload.bet.userId === userId) {
        setMyBet(null);
        pendingCreditRef.current = true;
        void waitForWalletCredit(walletRef.current?.balanceCents);
      }
    });

    socket.on(WS_EVENTS.BET_REMOVED, (payload: BetRemovedPayload) => {
      setRound((current) =>
        current?.id === payload.roundId
          ? { ...current, bets: current.bets.filter((bet) => bet.id !== payload.betId) }
          : current,
      );
      setMyBet((current) => (current?.id === payload.betId ? null : current));
    });

    socket.on("connect_error", () => {
      if (!wsErrorShownRef.current) {
        wsErrorShownRef.current = true;
        showToast("WebSocket offline — usando sincronização por polling", "info");
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, userId, refreshWallet, waitForWalletCredit, showToast]);

  const handlePlaceBet = useCallback(
    async (amountCents: number) => {
      if (sessionLockedRef.current) return;
      setBetting(true);
      try {
        const previousBalance = walletRef.current?.balanceCents ?? "0";
        const bet = await placeBet(requireToken(), amountCents);
        setMyBet(bet);
        await syncFromServer();
        const updated = await pollWalletUntilUpdated(requireToken(), previousBalance, 12);
        setWallet(updated);
        showToast("Aposta registrada!", "success");
      } catch (error) {
        if (!handleAuthError(error)) {
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Erro ao apostar";
          showToast(message, "error");
        }
      } finally {
        setBetting(false);
      }
    },
    [handleAuthError, requireToken, showToast, syncFromServer],
  );

  const handleCashout = useCallback(async () => {
    if (sessionLockedRef.current) return;
    setCashingOut(true);
    const previousBalance = walletRef.current?.balanceCents ?? "0";
    try {
      const bet = await cashout(requireToken());
      setMyBet(null);
      await syncFromServer();
      pendingCreditRef.current = true;
      const updated = await waitForWalletCredit(previousBalance);
      if (updated) {
        showToast(
          `Cash out ${formatMultiplier(bet.cashoutMultiplierBps)} — +${formatPayout(bet.payoutCents)}`,
          "success",
        );
      }
    } catch (error) {
      pendingCreditRef.current = false;
      if (!handleAuthError(error)) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Erro no cash out";
        showToast(message, "error");
      }
    } finally {
      setCashingOut(false);
    }
  }, [handleAuthError, requireToken, showToast, syncFromServer, waitForWalletCredit]);

  return {
    round,
    history,
    wallet,
    myBet,
    loading,
    betting,
    cashingOut,
    crashed,
    socketConnected,
    placeBet: handlePlaceBet,
    cashout: handleCashout,
    refreshWallet,
  };
}

function upsertBet<T extends { id: string }>(bets: T[], bet: T): T[] {
  const index = bets.findIndex((item) => item.id === bet.id);
  if (index === -1) return [...bets, bet];
  const next = [...bets];
  next[index] = bet;
  return next;
}

function formatMultiplier(bps: number | null): string {
  if (!bps) return "";
  return `${(bps / 10_000).toFixed(2)}x`;
}

function formatPayout(cents: string | null): string {
  if (!cents) return "";
  const value = Number(cents) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
