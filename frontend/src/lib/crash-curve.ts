const BASE_BPS = 10_000;
const TICK_MS = 50;
const GROWTH_FACTOR_BPS = 10_070;

export function multiplierAtElapsedMs(elapsedMs: number): number {
  const ticks = Math.max(0, Math.floor(elapsedMs / TICK_MS));
  let bps = BASE_BPS;
  for (let index = 0; index < ticks; index += 1) {
    bps = Math.floor((bps * GROWTH_FACTOR_BPS) / BASE_BPS);
  }
  return bps;
}

/** Tempo mínimo (ms) em que a fórmula do jogo atinge o multiplicador informado. */
export function elapsedMsForMultiplierBps(targetBps: number): number {
  if (targetBps <= BASE_BPS) return 0;

  let bps = BASE_BPS;
  let ticks = 0;
  const maxTicks = 500_000;

  while (bps < targetBps && ticks < maxTicks) {
    const next = Math.floor((bps * GROWTH_FACTOR_BPS) / BASE_BPS);
    if (next <= bps) break;
    bps = next;
    ticks += 1;
  }

  return ticks * TICK_MS;
}

export { TICK_MS, GROWTH_FACTOR_BPS, BASE_BPS };

export function elapsedMsFromRound(
  startedAt: string | null,
  crashedAt: string | null,
  status: string,
  nowMs: number,
): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (status === "CRASHED" && crashedAt) {
    return Math.max(0, new Date(crashedAt).getTime() - start);
  }
  return Math.max(0, nowMs - start);
}

export function formatMultiplierBlaze(bps: number): string {
  const value = bps / BASE_BPS;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted}X`;
}

export function formatAxisMultiplier(bps: number): string {
  const value = bps / BASE_BPS;
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return `x${Math.round(value)}`;
  }
  return `x${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAxisSeconds(seconds: number): string {
  return `${Math.round(seconds)}s`;
}
