/**
 * Chapter 9's matrix and chapter 10's arithmetic: every matrix cell is sourced or marked as
 * inferred, every harness has an engine run, and the cost and time splits add up to the
 * engine's own totals.
 */
import { describe, expect, it } from "vitest";

import { callCosts, timeSplit } from "@/lib/agent/cost";
import { CHOICES, HARNESSES, MATRIX, SOURCES } from "@/lib/agent/harnesses";
import { CHAPTER_CONFIGS, runConfig, type Ev } from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";

const tok = nodeTokenizer();

describe("harness matrix", () => {
  it("covers every harness and choice", () => {
    for (const h of HARNESSES)
      for (const c of CHOICES)
        expect(MATRIX[h.key][c].text.length, `${h.key} ${c}`).toBeGreaterThan(
          3,
        );
  });
  it("sources every documented cell; the rest say inferred", () => {
    for (const h of HARNESSES)
      for (const c of CHOICES) {
        if (c === "Imitated as") continue;
        const cell = MATRIX[h.key][c];
        expect(!!cell.src || !!cell.inferred, `${h.key} ${c}`).toBe(true);
        if (cell.src) expect(SOURCES[cell.src].url).toMatch(/^https:\/\//);
      }
  });
  it("has an engine run per harness, all on the same task and price", () => {
    const runs = CHAPTER_CONFIGS.harnesses;
    expect(Object.keys(runs).sort()).toEqual(
      HARNESSES.map((h) => h.key).sort(),
    );
    for (const cfg of Object.values(runs)) {
      expect(cfg.scenario).toBe("fix_test_guarded");
      expect(cfg.policy!.cache.price).toBe("claude-sonnet-4.6");
    }
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
        c.reduce((s, x) => s + x.usdFresh + x.usdCached + x.usdOutput, 0),
        end.totals.cost,
      );
      expect(c.reduce((s, x) => s + x.fresh + x.cached, 0)).toBe(
        end.totals.input_tokens,
      );
      for (const x of c) expect(x.usdFresh).toBeGreaterThanOrEqual(-1e-15);
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
