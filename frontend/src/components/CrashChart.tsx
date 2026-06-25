import { useEffect, useMemo, useState } from "react";
import type { Round } from "../types/game";
import {
  elapsedMsFromRound,
  elapsedMsForMultiplierBps,
  formatAxisMultiplier,
  formatAxisSeconds,
  formatMultiplierBlaze,
  multiplierAtElapsedMs,
  TICK_MS,
} from "../lib/crash-curve";
import { truncateHash } from "../lib/format";

const BASE_BPS = 10_000;
const CHART_W = 400;
const CHART_H = 220;
const PAD_LEFT = 42;
const PAD_RIGHT = 14;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PX_PER_SEC = 32;
const HEAD_FRACTION = 0.78;
const LINE_COLOR = "#f5456e";
const LINE_COLOR_CRASHED = "#e9143c";

interface CrashChartProps {
  round: Round | null;
  crashed: boolean;
}

export function CrashChart({ round, crashed }: CrashChartProps) {
  const [now, setNow] = useState(() => Date.now());
  const isCrashed = crashed || round?.status === "CRASHED";
  const isRunning = round?.status === "RUNNING" && !isCrashed;

  useEffect(() => {
    if (!isRunning) return;
    let frame = 0;
    const loop = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isRunning, round?.id]);

  const elapsedMs = useMemo(
    () =>
      elapsedMsFromRound(
        round?.startedAt ?? null,
        round?.crashedAt ?? null,
        round?.status ?? "BETTING",
        now,
      ),
    [round?.startedAt, round?.crashedAt, round?.status, now],
  );

  const displayBps = isCrashed
    ? (round?.crashPointBps ?? round?.currentMultiplierBps ?? BASE_BPS)
    : (round?.currentMultiplierBps ?? BASE_BPS);

  const chart = useMemo(
    () => buildChartGeometry(elapsedMs, displayBps, isCrashed),
    [elapsedMs, displayBps, isCrashed],
  );

  const multiplierLabel = formatMultiplierBlaze(displayBps);
  const showCurve = round?.status === "RUNNING" || round?.status === "CRASHED";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-4 md:p-6 transition-colors duration-300 ${
        isCrashed
          ? "animate-crash-shake border-[var(--color-danger)] shadow-[0_0_40px_rgba(255,51,102,0.25)]"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
            Rodada #{round?.roundNumber ?? "—"}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Seed hash:{" "}
            <span className="font-mono text-[var(--color-neon-dim)]">
              {round ? truncateHash(round.serverSeedHash, 16) : "—"}
            </span>
          </p>
        </div>
        <StatusBadge status={isCrashed ? "CRASHED" : (round?.status ?? "BETTING")} />
      </div>

      {round?.status === "BETTING" && !isCrashed && (
        <div className="mb-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2 text-center text-sm text-[var(--color-warning)]">
          Fase de apostas — faça sua aposta antes do multiplicador decolar
        </div>
      )}

      {isCrashed && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/15 px-4 py-2.5 text-sm font-semibold text-[var(--color-danger)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
          CRASH em {formatMultiplierBlaze(displayBps)}
        </div>
      )}

      <div className="relative aspect-[16/9] min-h-[220px] w-full overflow-hidden rounded-xl bg-[#1a1d24]">
        {isCrashed && <div className="pointer-events-none absolute inset-0 z-10 animate-crash-flash bg-[var(--color-danger)]/15" />}

        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <clipPath id="crash-chart-clip">
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={CHART_W - PAD_LEFT - PAD_RIGHT}
                height={CHART_H - PAD_TOP - PAD_BOTTOM}
              />
            </clipPath>
          </defs>

          {chart.gridLines.map((bps) => {
            const y = chart.toY(bps);
            return (
              <g key={bps}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={CHART_W - PAD_RIGHT}
                  y2={y}
                  stroke="#2d3139"
                  strokeWidth="1"
                />
                <text x={4} y={y + 3} fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">
                  {formatAxisMultiplier(bps)}
                </text>
              </g>
            );
          })}

          {chart.timeLabels.map((seconds) => {
            const x = chart.toX(seconds);
            if (x < PAD_LEFT - 4 || x > CHART_W - PAD_RIGHT + 4) return null;
            return (
              <text
                key={seconds}
                x={x}
                y={CHART_H - 6}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="9"
                fontFamily="system-ui, sans-serif"
              >
                {formatAxisSeconds(seconds)}
              </text>
            );
          })}

          <line
            x1={PAD_LEFT}
            y1={chart.toY(BASE_BPS)}
            x2={CHART_W - PAD_RIGHT}
            y2={chart.toY(BASE_BPS)}
            stroke="#3d424d"
            strokeWidth="1"
          />

          <g clipPath="url(#crash-chart-clip)">
            {showCurve && chart.path && (
              <>
                <path
                  d={chart.path}
                  fill="none"
                  stroke={isCrashed ? LINE_COLOR_CRASHED : LINE_COLOR}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x={chart.headX - 5}
                  y={chart.headY - 5}
                  width="10"
                  height="10"
                  rx="2"
                  fill={isCrashed ? LINE_COLOR_CRASHED : LINE_COLOR}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </>
            )}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`rounded-xl px-6 py-3 backdrop-blur-sm transition-colors duration-200 ${
              isCrashed
                ? "bg-black/60 ring-1 ring-[var(--color-danger)]/40"
                : isRunning
                  ? "bg-black/55 ring-1 ring-white/10"
                  : "bg-black/45 ring-1 ring-white/5"
            }`}
          >
            <p
              className={`font-mono text-4xl font-bold tracking-tight md:text-6xl ${
                isCrashed ? "text-[var(--color-danger)]" : "text-white"
              }`}
            >
              {multiplierLabel}
            </p>
          </div>
        </div>
      </div>

      {isCrashed && round?.serverSeed && (
        <p className="mt-3 text-center font-mono text-xs text-[var(--color-muted)]">
          Seed revelada: {truncateHash(round.serverSeed, 24)}
        </p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "BETTING"
      ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/40"
      : status === "RUNNING"
        ? "bg-[var(--color-neon)]/20 text-[var(--color-neon)] border-[var(--color-neon)]/40"
        : "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/40";

  const labels: Record<string, string> = {
    BETTING: "Apostas abertas",
    RUNNING: "Em andamento",
    CRASHED: "Crashou",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${styles}`}>
      {labels[status] ?? status}
    </span>
  );
}

function computeYMaxBps(peakBps: number): number {
  const ratio = peakBps / BASE_BPS;
  const withHeadroom = Math.max(ratio * 1.35, ratio + 0.2);
  const steps = [1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200];
  for (const step of steps) {
    if (withHeadroom <= step) return Math.round(step * BASE_BPS);
  }
  return Math.ceil(withHeadroom * 1.1) * BASE_BPS;
}

function buildGridLines(yMaxBps: number): number[] {
  const maxRatio = yMaxBps / BASE_BPS;
  const lines: number[] = [BASE_BPS];

  if (maxRatio <= 1.5) {
    if (yMaxBps > BASE_BPS) lines.push(yMaxBps);
    return lines;
  }

  const niceSteps = [0.5, 1, 2, 5, 10, 20, 25, 50];
  const targetLines = 3;
  const rawStep = (maxRatio - 1) / (targetLines + 1);

  let step = niceSteps[0];
  for (const candidate of niceSteps) {
    if (candidate >= rawStep) {
      step = candidate;
      break;
    }
  }

  for (let value = 1 + step; value < maxRatio * 0.98; value += step) {
    lines.push(Math.round(value * BASE_BPS));
    if (lines.length >= 4) break;
  }

  return lines;
}

function buildTimeLabels(visibleStartSec: number, visibleEndSec: number): number[] {
  const labels: number[] = [];
  const step = visibleEndSec - visibleStartSec <= 8 ? 1 : 2;
  const first = Math.ceil(visibleStartSec / step) * step;

  for (let value = first; value <= visibleEndSec + 0.01; value += step) {
    labels.push(value);
    if (labels.length >= 6) break;
  }

  if (labels.length === 0) labels.push(0);
  return labels;
}

function buildChartGeometry(elapsedMs: number, currentBps: number, isCrashed: boolean) {
  const serverElapsedMs = elapsedMsForMultiplierBps(currentBps);
  const drawElapsedMs = isCrashed
    ? elapsedMs
    : Math.min(elapsedMs, serverElapsedMs + TICK_MS * 0.85);
  const drawElapsedSec = drawElapsedMs / 1000;

  const peakBps = Math.max(currentBps, BASE_BPS);
  const yMaxBps = computeYMaxBps(peakBps);
  const drawableW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const drawableH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const headTargetX = PAD_LEFT + drawableW * HEAD_FRACTION;

  const toY = (bps: number) => {
    const safeBps = Math.max(bps, BASE_BPS);
    const ratio = (safeBps - BASE_BPS) / (yMaxBps - BASE_BPS);
    return CHART_H - PAD_BOTTOM - Math.min(ratio, 1) * drawableH;
  };

  const naturalWidth = Math.max(0, drawElapsedSec * PX_PER_SEC);
  const offsetX = Math.max(0, naturalWidth - (headTargetX - PAD_LEFT));

  const toX = (seconds: number) => PAD_LEFT + seconds * PX_PER_SEC - offsetX;

  const visibleStartSec = offsetX / PX_PER_SEC;
  const visibleEndSec = visibleStartSec + drawableW / PX_PER_SEC;

  const sampleStepSec = 0.05;
  const coords: { x: number; y: number }[] = [];

  for (let seconds = 0; seconds <= drawElapsedSec + sampleStepSec; seconds += sampleStepSec) {
    const t = Math.min(seconds, drawElapsedSec);
    const bps = t >= drawElapsedSec - 0.001 ? currentBps : multiplierAtElapsedMs(t * 1000);
    coords.push({ x: toX(t), y: toY(bps) });
    if (seconds > drawElapsedSec) break;
  }

  if (coords.length === 0) {
    coords.push({ x: toX(0), y: toY(BASE_BPS) });
  }

  const head = { x: toX(drawElapsedSec), y: toY(currentBps) };
  coords[coords.length - 1] = head;

  const path =
    coords.length >= 1
      ? coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")
      : "";

  return {
    path,
    headX: head.x,
    headY: head.y,
    yMaxBps,
    gridLines: buildGridLines(yMaxBps),
    timeLabels: buildTimeLabels(visibleStartSec, visibleEndSec),
    toX,
    toY,
    isCrashed,
  };
}
