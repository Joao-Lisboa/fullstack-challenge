const MULTIPLIER_BASE_BPS = 10_000;

export function bpsToMultiplier(bps: number): string {
  return (bps / MULTIPLIER_BASE_BPS).toFixed(2);
}

export function formatCurrency(cents: string | number | bigint): string {
  const value = Number(cents) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBrlToCents(input: string): number | null {
  const normalized = input.replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function calculatePayoutCents(amountCents: number, multiplierBps: number): number {
  return Math.floor((amountCents * multiplierBps) / MULTIPLIER_BASE_BPS);
}

export function crashColorClass(crashPointBps: number): string {
  const multiplier = crashPointBps / MULTIPLIER_BASE_BPS;
  if (multiplier < 1.5) return "bg-red-500/80 text-white";
  if (multiplier < 2) return "bg-orange-500/80 text-white";
  if (multiplier < 5) return "bg-yellow-500/80 text-black";
  if (multiplier < 10) return "bg-emerald-500/80 text-white";
  return "bg-[var(--color-neon)]/90 text-black";
}

export function truncateHash(hash: string, length = 12): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}…`;
}
