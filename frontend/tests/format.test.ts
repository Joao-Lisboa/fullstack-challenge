import { describe, expect, it } from "bun:test";
import {
  bpsToMultiplier,
  calculatePayoutCents,
  crashColorClass,
  formatCurrency,
  parseBrlToCents,
} from "../src/lib/format";

describe("format helpers", () => {
  it("converts basis points to multiplier", () => {
    expect(bpsToMultiplier(10_000)).toBe("1.00");
    expect(bpsToMultiplier(15_340)).toBe("1.53");
  });

  it("formats BRL currency", () => {
    expect(formatCurrency(1000)).toContain("10");
  });

  it("parses BRL input to cents", () => {
    expect(parseBrlToCents("10,50")).toBe(1050);
    expect(parseBrlToCents("abc")).toBeNull();
  });

  it("calculates payout without float money", () => {
    expect(calculatePayoutCents(1000, 15_000)).toBe(1500);
  });

  it("assigns crash colors by multiplier", () => {
    expect(crashColorClass(18_000)).toContain("orange");
    expect(crashColorClass(50_000)).toContain("emerald");
    expect(crashColorClass(120_000)).toContain("neon");
  });
});
