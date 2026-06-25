import { formatCurrency } from "../lib/format";

interface PlayerBarProps {
  username: string;
  balanceCents: string | null;
  loading?: boolean;
  onLogout: () => void;
}

export function PlayerBar({ username, balanceCents, loading, onLogout }: PlayerBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-5 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Jogador</p>
        <p className="text-lg font-semibold">{username}</p>
      </div>

      <div className="text-right">
        <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Saldo</p>
        {loading ? (
          <div className="mt-1 h-7 w-28 animate-pulse rounded bg-[var(--color-surface-2)]" />
        ) : (
          <p className="font-mono text-2xl font-bold text-[var(--color-neon)]">
            {balanceCents ? formatCurrency(balanceCents) : "—"}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
      >
        Sair
      </button>
    </header>
  );
}
