import type { RoundBet } from "../types/game";
import { bpsToMultiplier, formatCurrency } from "../lib/format";

interface RoundBetsProps {
  bets: RoundBet[];
  currentUserId?: string;
}

export function RoundBets({ bets, currentUserId }: RoundBetsProps) {
  const sorted = [...bets].sort((a, b) => {
    const priority = (status: string) => {
      if (status === "CASHED_OUT") return 0;
      if (status === "ACTIVE") return 1;
      return 2;
    };
    return priority(a.status) - priority(b.status);
  });

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Apostas da rodada
      </h2>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">Nenhuma aposta ainda</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {sorted.map((bet) => (
            <li
              key={bet.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                bet.userId === currentUserId
                  ? "border-[var(--color-neon)]/40 bg-[var(--color-neon)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
              } ${bet.status === "CASHED_OUT" ? "ring-1 ring-[var(--color-neon)]/30" : ""}`}
            >
              <div>
                <p className="font-medium">{bet.username}</p>
                <p className="text-xs text-[var(--color-muted)]">{formatCurrency(bet.amountCents)}</p>
              </div>
              <BetStatusLabel bet={bet} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BetStatusLabel({ bet }: { bet: RoundBet }) {
  if (bet.status === "CASHED_OUT" && bet.cashoutMultiplierBps) {
    return (
      <span className="font-mono text-xs font-semibold text-[var(--color-neon)]">
        {bpsToMultiplier(bet.cashoutMultiplierBps)}x
        {bet.payoutCents && (
          <span className="block text-right text-[var(--color-muted)]">
            {formatCurrency(bet.payoutCents)}
          </span>
        )}
      </span>
    );
  }

  const labels: Record<string, string> = {
    AWAITING_DEBIT: "Processando",
    ACTIVE: "Ativa",
    LOST: "Perdeu",
    CASHED_OUT: "Cash out",
  };

  const colors: Record<string, string> = {
    AWAITING_DEBIT: "text-[var(--color-warning)]",
    ACTIVE: "text-white",
    LOST: "text-[var(--color-danger)]",
    CASHED_OUT: "text-[var(--color-neon)]",
  };

  return (
    <span className={`text-xs font-semibold uppercase ${colors[bet.status] ?? "text-[var(--color-muted)]"}`}>
      {labels[bet.status] ?? bet.status}
    </span>
  );
}
