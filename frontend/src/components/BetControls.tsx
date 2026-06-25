import { useEffect, useState } from "react";
import type { Bet, Round } from "../types/game";
import { GAME_LIMITS } from "../types/game";
import { bpsToMultiplier, calculatePayoutCents, formatCurrency, parseBrlToCents } from "../lib/format";

interface BetControlsProps {
  round: Round | null;
  myBet: Bet | null;
  betting: boolean;
  cashingOut: boolean;
  onPlaceBet: (amountCents: number) => Promise<void>;
  onCashout: () => Promise<void>;
}

export function BetControls({
  round,
  myBet,
  betting,
  cashingOut,
  onPlaceBet,
  onCashout,
}: BetControlsProps) {
  const [amount, setAmount] = useState("10.00");
  const [countdown, setCountdown] = useState(0);

  const isBettingPhase = round?.status === "BETTING";
  const isRunning = round?.status === "RUNNING";
  const hasActiveBet = myBet?.status === "ACTIVE" || myBet?.status === "AWAITING_DEBIT";
  const isPendingDebit = myBet?.status === "AWAITING_DEBIT";
  const canBet = isBettingPhase && !hasActiveBet && !betting;
  const canCashout = isRunning && myBet?.status === "ACTIVE" && !cashingOut;

  useEffect(() => {
    if (!round?.bettingEndsAt || round.status !== "BETTING") {
      setCountdown(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(round.bettingEndsAt!).getTime() - Date.now()) / 1000),
      );
      setCountdown(remaining);
    };

    update();
    const interval = window.setInterval(update, 200);
    return () => window.clearInterval(interval);
  }, [round?.bettingEndsAt, round?.status]);

  const amountCents = parseBrlToCents(amount) ?? 0;
  const potentialPayout =
    round && myBet?.status === "ACTIVE"
      ? calculatePayoutCents(Number(myBet.amountCents), round.currentMultiplierBps)
      : calculatePayoutCents(amountCents, round?.currentMultiplierBps ?? 10_000);

  const validationError = getValidationError(amountCents, canBet);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          Controles
        </h2>
        {isBettingPhase && (
          <span className="font-mono text-sm text-[var(--color-warning)]">
            {countdown > 0 ? `Fecha em ${countdown}s` : "Iniciando…"}
          </span>
        )}
        {isRunning && (
          <span className="font-mono text-sm text-[var(--color-neon)]">
            {bpsToMultiplier(round.currentMultiplierBps)}x
          </span>
        )}
      </div>

      <label className="mb-2 block text-xs text-[var(--color-muted)]">Valor da aposta (R$)</label>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        disabled={!isBettingPhase || hasActiveBet}
        className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 font-mono text-lg outline-none focus:border-[var(--color-neon)] disabled:opacity-50"
        placeholder="10.00"
      />

      {validationError && canBet && (
        <p className="mb-3 text-xs text-[var(--color-danger)]">{validationError}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!canBet || !!validationError}
          onClick={() => void onPlaceBet(amountCents)}
          className="rounded-lg bg-[var(--color-neon)] py-3 font-semibold text-black transition hover:bg-[var(--color-neon-dim)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {betting ? "Apostando…" : "Apostar"}
        </button>

        <button
          type="button"
          disabled={!canCashout}
          onClick={() => void onCashout()}
          className="rounded-lg border border-[var(--color-neon)] bg-[var(--color-neon)]/10 py-3 font-semibold text-[var(--color-neon)] transition hover:bg-[var(--color-neon)]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cashingOut ? "Saindo…" : "Cash Out"}
        </button>
      </div>

      {hasActiveBet && myBet && (
        <div className="mt-4 space-y-1 text-center text-sm">
          <p className="text-[var(--color-muted)]">
            Aposta: <span className="font-mono text-white">{formatCurrency(myBet.amountCents)}</span>
            {" · "}
            <span className={statusColor(myBet.status)}>{statusLabel(myBet.status)}</span>
          </p>

          {isPendingDebit && (
            <p className="text-xs text-[var(--color-warning)]">Confirmando débito na carteira…</p>
          )}

          {myBet.status === "ACTIVE" && isBettingPhase && (
            <p className="text-xs text-[var(--color-neon)]">Aposta confirmada — aguardando decolagem</p>
          )}

          {myBet.status === "ACTIVE" && isRunning && (
            <p className="font-mono text-[var(--color-neon)]">
              Pagamento agora: {formatCurrency(potentialPayout)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function getValidationError(amountCents: number, canBet: boolean): string | null {
  if (!canBet) return null;
  if (amountCents < GAME_LIMITS.minBetCents) {
    return `Mínimo ${formatCurrency(GAME_LIMITS.minBetCents)}`;
  }
  if (amountCents > GAME_LIMITS.maxBetCents) {
    return `Máximo ${formatCurrency(GAME_LIMITS.maxBetCents)}`;
  }
  return null;
}

function statusLabel(status: Bet["status"]): string {
  const labels: Record<Bet["status"], string> = {
    AWAITING_DEBIT: "Processando",
    ACTIVE: "Ativa",
    CASHED_OUT: "Cash out",
    LOST: "Perdeu",
  };
  return labels[status];
}

function statusColor(status: Bet["status"]): string {
  const colors: Record<Bet["status"], string> = {
    AWAITING_DEBIT: "text-[var(--color-warning)]",
    ACTIVE: "text-[var(--color-neon)]",
    CASHED_OUT: "text-[var(--color-neon)]",
    LOST: "text-[var(--color-danger)]",
  };
  return colors[status];
}
