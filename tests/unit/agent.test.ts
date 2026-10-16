/**
 * Chapter 9's matrix and chapter 10's arithmetic: every matrix cell is sourced or marked as
 * inferred, every harness has an engine run, and the cost and time splits add up to the
 * engine's own totals.
 */
import { describe, expect, it } from "vitest";

import { callCosts, timeSplit } from "@/lib/agent/cost";
import {
  CHOICES,
  COLUMNS,
  HARNESSES,
  MATRIX,
  SOURCES,
} from "@/lib/agent/harnesses";
import {
  GENERATIONS,
  PRICE_OF,
  THINKING,
  shortName,
  tierOptions,
} from "@/lib/agent/prices";
import { PRICES } from "@/lib/engine/vendor/index";
import { CHAPTER_CONFIGS, runConfig, type Ev } from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";

const tok = nodeTokenizer();

describe("harness matrix", () => {
  it("covers every harness, SDK and choice", () => {
    for (const h of COLUMNS)
      for (const c of CHOICES)
        expect(MATRIX[h.key][c].text.length, `${h.key} ${c}`).toBeGreaterThan(
          3,
        );
  });
  it("sources every documented cell; the rest say inferred", () => {
    for (const h of COLUMNS)
      for (const c of CHOICES) {
        if (c === "Imitated as") continue;
        const cell = MATRIX[h.key][c];
        expect(!!cell.src || !!cell.inferred, `${h.key} ${c}`).toBe(true);
        if (cell.src) expect(SOURCES[cell.src].url).toMatch(/^https:\/\//);
      }
  });
  it("has an engine run per harness and price, all on the same task", () => {
    const runs = CHAPTER_CONFIGS.harnesses;
    expect(Object.keys(runs).sort()).toEqual(
      HARNESSES.flatMap((h) => [h.key, `${h.key}@claude-sonnet-5.5`]).sort(),
    );
    for (const [k, cfg] of Object.entries(runs)) {
      expect(cfg.scenario).toBe("fix_test_guarded");
      expect(cfg.policy!.cache.price).toBe(
        k.endsWith("@claude-sonnet-5.5")
          ? "claude-sonnet-5.5"
          : "claude-sonnet-4.6",
      );
      // the two prices differ in nothing else
      const base = runs[k.replace("@claude-sonnet-5.5", "")]!;
      expect({ ...cfg.policy, cache: {} }).toEqual({
        ...base.policy,
        cache: {},
      });
    }
  });
});

describe("price switch (brief 43)", () => {
  it("names only priced models, with their read multipliers", () => {
    for (const g of Object.values(PRICE_OF))
      for (const k of Object.values(g)) {
        const p = PRICES[k]!;
        expect(p.cache_read).toBeCloseTo(p.read_multiplier * p.input, 12);
      }
    expect(PRICES["claude-sonnet-5.5"]!.read_multiplier).toBe(0.05);
    expect(PRICES["claude-sonnet-5.5"]!.min_tokens).toBe(512);
    expect(PRICES["claude-sonnet-4.6"]!.min_tokens).toBe(1024);
  });
  it("labels each generation's buttons with that generation's models", () => {
    expect(GENERATIONS.map((g) => g.value)).toEqual(["earlier", "current"]);
    expect(tierOptions("earlier").map((o) => o.label)).toEqual([
      "Sonnet 4.6",
      "Haiku 4.5",
      "GPT-5 mini",
    ]);
    expect(tierOptions("current").map((o) => o.label)).toEqual([
      "Sonnet 5.5",
      "Haiku 5.5",
      "GPT-6.1 Sol",
    ]);
    expect(shortName("gpt-oss-120b")).toBe("gpt-oss-120b");
    expect(shortName("no-such-model")).toBe("no-such-model");
    expect(THINKING.map((t) => Number(t.value))).toEqual([0, 1000, 4000]);
  });
});

describe("cost and time splits add up", () => {
  const close = (a: number, b: number) =>
    expect(Math.abs(a - b)).toBeLessThan(1e-9 * Math.max(1, Math.abs(b)));
  for (const [key, cfg] of Object.entries(CHAPTER_CONFIGS.cost)) {
    it(key, () => {
      const ev: Ev[] = runConfig(cfg, tok);
      const end = ev[ev.length - 1]!;
      const c = callCosts(ev);
      expect(c.length).toBe(end.totals.model_calls);
      close(
        c.reduce(
          (s, x) => s + x.usdFresh + x.usdCached + x.usdOutput + x.usdThinking,
          0,
        ),
        end.totals.cost,
      );
      expect(c.reduce((s, x) => s + x.fresh + x.cached, 0)).toBe(
        end.totals.input_tokens,
      );
      for (const x of c) expect(x.usdFresh).toBeGreaterThanOrEqual(-1e-15);
      const think = (cfg.policy?.thinking?.tokens as number | undefined) ?? 0;
      expect(c.reduce((s, x) => s + x.thinking, 0)).toBe(
        think ? (end.totals.thinking_tokens as number) : 0,
      );
      // no parallel tool calls and no hooks in these runs: the parts are the wall clock
      const t = timeSplit(ev);
      close(t.ttft + t.decode + t.tool + t.human + t.backoff, end.elapsed);
    });
  }
  it("back-off is split out of the tool time", () => {
    const ev = runConfig(CHAPTER_CONFIGS.recovery["r2-stop"]!, tok);
    const t = timeSplit(ev);
    expect(t.backoff).toBeGreaterThan(0);
    close(
      t.ttft + t.decode + t.tool + t.human + t.backoff,
      ev[ev.length - 1]!.elapsed,
    );
  });
});
