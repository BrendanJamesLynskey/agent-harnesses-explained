/**
 * Every number the prose quotes is computed by the engine: each <V of="…"> path in the
 * chapters (and the paths the home and about pages use) resolves, and a few spot values are
 * what the runs say they are.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatValue, lookup, serverRuns, summarise } from "@/lib/agent/values";

const ROOT = path.join(__dirname, "../..");
const DIR = path.join(ROOT, "content/chapters");
const SOURCES = [
  ...readdirSync(DIR).map((f) => readFileSync(path.join(DIR, f), "utf8")),
  readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8"),
  readFileSync(path.join(ROOT, "src/app/about/page.tsx"), "utf8"),
];

describe("values", () => {
  it("every path in the prose resolves", () => {
    const paths = new Set<string>();
    for (const s of SOURCES) {
      for (const m of s.matchAll(/<V of="([^"]+)"/g)) paths.add(m[1]!);
      for (const m of s.matchAll(/v\("([^"]+)"/g)) paths.add(m[1]!);
    }
    expect(paths.size).toBeGreaterThan(40);
    for (const p of paths) expect(() => lookup(p), p).not.toThrow();
  });

  it("keys with dots resolve, missing ones throw", () => {
    expect(lookup("prices.claude-sonnet-4.6.input")).toBe(3);
    expect(lookup("cache.stable-claude-sonnet-4.6.status")).toBe("done");
    expect(() => lookup("cache.nope.status")).toThrow(/no value/);
    expect(() => lookup("prices.claude-sonnet-4.6.input.x")).toThrow(
      /no value/,
    );
  });

  it("spot values match the runs", () => {
    const loop = serverRuns("loop").scripted!;
    const end = loop[loop.length - 1]!;
    expect(lookup("loop.scripted.input_tokens")).toBe(end.totals.input_tokens);
    expect(lookup("budget.w3000-none.status")).toBe("context_overflow");
    expect(lookup("budget.w3000-summarise.facts_lost")).toBe(0);
    expect(lookup("toolcall.extra.native")).toBe(
      (lookup("toolcall.native.bad_context") as number) +
        ((lookup("toolcall.native.bad_assistant") as number) +
          (lookup("toolcall.native.bad_error") as number)) *
          (lookup("toolcall.native.bad_later") as number),
    );
    expect(
      lookup("cache.timestamp-claude-sonnet-4.6.saving") as number,
    ).toBeLessThan(0);
    expect(lookup("cache.stable-claude-haiku-4.5.cached_tokens")).toBe(0);
    expect(lookup("permissions.read_only-rule.denied")).toBe(5);
    expect(summarise(loop).turns).toBe(lookup("loop.scripted.turns"));
  });

  it("formats each kind", () => {
    expect(formatValue(12345, "int")).toBe("12,345");
    expect(formatValue(12345, "tokens")).toBe("12,345 tokens");
    expect(formatValue(0.0256, "usd")).toBe("$0.0256");
    expect(formatValue(0.5448, "usd")).toBe("$0.54");
    expect(formatValue(9787.2, "ms")).toBe("9.79 s");
    expect(formatValue(0.53, "pct")).toBe("53%");
    expect(formatValue(42.7, "num")).toBe("42.7");
    expect(formatValue("a, b", "raw")).toBe("a, b");
  });
});
