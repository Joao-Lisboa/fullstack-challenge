import type { Round } from "../types/game";
import { bpsToMultiplier, crashColorClass } from "../lib/format";

interface RoundHistoryProps {
  rounds: Round[];
}

export function RoundHistory({ rounds }: RoundHistoryProps) {
  const crashedRounds = rounds.filter((round) => round.crashPointBps !== null);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Histórico
      </h2>

      {crashedRounds.length === 0 ? (
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-14 animate-pulse rounded-md bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {crashedRounds.map((round) => (
            <div
              key={round.id}
              title={`Rodada #${round.roundNumber}`}
              className={`rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold ${crashColorClass(round.crashPointBps!)}`}
            >
              {bpsToMultiplier(round.crashPointBps!)}x
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
