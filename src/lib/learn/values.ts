/**
 * The learning layer's numbers (brief 44) that are not already a path in the
 * chapters' value tree (`src/lib/agent/values.ts`): each is a ratio or a
 * bound computed here from the same engine runs and prices the chapters
 * quote, at build time. A self-check cites one as `<Check v="…">`, prose as
 * `<V v="…" />`; tests/unit/learn.test.ts checks every one against the tree.
 */
import { lookup } from "@/lib/agent/values";

const n = (path: string): number => {
  const v = lookup(path);
  if (typeof v !== "number") throw new Error(`${path} is not a number`);
  return v;
};

const VALUES: Record<string, () => number> = {
  // chapter 1: tokens sent per token written, and the tools' share of call 1
  "ch01.inPerOut": () =>
    n("loop.scripted.input_tokens") / n("loop.scripted.output_tokens"),
  "ch01.toolsShare": () =>
    n("loop.scripted.tools_tokens") / n("loop.scripted.first_input"),
  // chapter 3: what summarising cost against truncating
  "ch03.summariseOverTruncate": () =>
    n("budget.w3000-summarise.cost") / n("budget.w3000-truncate.cost"),
  // chapter 4: the timestamp layout against no cache; the most a cache saves
  "ch04.timestampOverPlain": () =>
    n("cache.timestamp-claude-sonnet-5.5.cost") /
    n("cache.timestamp-claude-sonnet-5.5.cost_plain"),
  "ch04.maxSaving.sonnet55": () =>
    1 - n("prices.claude-sonnet-5.5.read_multiplier"),
  // chapter 4: re-uses that repay the write, k > (w - 1) / (1 - rho)
  "ch04.breakEven.sonnet55": () => {
    const w =
      n("prices.claude-sonnet-5.5.cache_write") /
      n("prices.claude-sonnet-5.5.input");
    return (w - 1) / (1 - n("prices.claude-sonnet-5.5.read_multiplier"));
  },
  // chapter 5: the share of the strictest mode's run spent waiting
  "ch05.askWaitShare": () =>
    n("permissions.ask-rule.human_wait") / n("permissions.ask-rule.elapsed"),
  // chapter 10: the fix with the cache off, against on (Sonnet 5.5)
  "ch10.nocacheOverCache": () =>
    n("cost.fix_test-claude-sonnet-5.5-hosted-nocache-auto.cost") /
    n("cost.fix_test-claude-sonnet-5.5-hosted-cache-auto.cost"),
};

export const LEARN_VALUE_NAMES = Object.keys(VALUES);

const CACHE = new Map<string, number>();

export function learnValue(name: string): number {
  const cached = CACHE.get(name);
  if (cached !== undefined) return cached;
  const f = VALUES[name];
  if (!f) throw new Error(`no learn value ${name}`);
  const v = f();
  if (!Number.isFinite(v)) throw new Error(`learn value ${name} is ${v}`);
  CACHE.set(name, v);
  return v;
}
