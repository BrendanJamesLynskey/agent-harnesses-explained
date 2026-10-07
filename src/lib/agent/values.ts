/**
 * Every number the chapters quote comes from here: a path into a summary of the engine's runs
 * (the same runs the animations draw, src/data/chapter_configs.json), e.g.
 * "cache.stable-claude-sonnet-4.6.saving" or "loop.scripted.turns", formatted by kind. The MDX
 * writes <V of="…" fmt="…" />, so prose cannot drift from the tested engine
 * (tests/unit/values.test.ts checks every path the chapters use resolves).
 *
 * Server-side only: it reads the tokenizer from disk.
 */
import {
  CHAPTER_CONFIGS,
  DEFAULT_POLICY,
  LATENCY,
  PRICES,
  TRACES,
  cacheFrames,
  runChapter,
  type Chapter,
  type Ev,
  type Obj,
} from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";
import { fmtInt, fmtMs, fmtUsd, pct, trim } from "@/lib/format";

export type Fmt = "int" | "tokens" | "usd" | "ms" | "pct" | "num" | "raw";

export function summarise(ev: Ev[]): Obj {
  const end = ev[ev.length - 1]!;
  const acts = ev.filter(
    (e) => e.type === "model_call" && e.purpose === "act" && e.agent === "main",
  );
  const first = acts[0]!;
  const part = (kind: string) =>
    (first.context as Obj[])
      .filter((c) => c.kind === kind)
      .reduce((s, c) => s + (c.tokens as number), 0);
  const cf = cacheFrames(ev);
  const last = cf[cf.length - 1]!;
  const lost = ev
    .filter((e) => e.type === "compaction")
    .flatMap((e) => e.facts_lost as string[]);
  // a malformed call: its own tokens and the error fed back, re-read by every later call
  const errAt = ev.findIndex(
    (e) => e.type === "error" && e.kind === "malformed",
  );
  const bad: Obj = {};
  if (errAt >= 0) {
    const call = ev
      .slice(0, errAt)
      .filter((e) => e.type === "model_call")
      .pop()!;
    const later = acts.filter((e) => (e.seq as number) > errAt).length;
    bad.bad_context = call.input_tokens;
    bad.bad_assistant = call.message_tokens;
    bad.bad_error = ev[errAt]!.message_tokens;
    bad.bad_later = later;
    bad.bad_reread =
      ((call.message_tokens as number) +
        (ev[errAt]!.message_tokens as number)) *
      later;
  }
  return {
    ...bad,
    status: end.status,
    elapsed: end.elapsed,
    ...end.totals,
    turns: acts.length,
    peak: Math.max(...acts.map((e) => e.input_tokens as number)),
    first_input: first.input_tokens,
    system_tokens: part("system"),
    tools_tokens: part("tools"),
    task_tokens: part("task"),
    hit:
      (end.totals.cached_tokens as number) /
      (end.totals.input_tokens as number),
    cost_plain: last.cum_plain,
    saving: 1 - (last.cum as number) / (last.cum_plain as number),
    facts_lost: lost.length,
    facts_lost_list: lost.join(", "),
  };
}

let TREE: Obj | null = null;
const RUNS = new Map<Chapter, Record<string, Ev[]>>();

/** A chapter's runs, computed once on the server (for static pictures). */
export function serverRuns(chapter: Chapter): Record<string, Ev[]> {
  let r = RUNS.get(chapter);
  if (!r) {
    r = runChapter(chapter, nodeTokenizer());
    RUNS.set(chapter, r);
  }
  return r;
}

function tree(): Obj {
  if (TREE) return TREE;
  const t: Obj = {
    prices: PRICES,
    latency: LATENCY,
    policy: DEFAULT_POLICY,
    traces: {},
  };
  for (const chapter of Object.keys(CHAPTER_CONFIGS) as Chapter[]) {
    const runs = serverRuns(chapter);
    t[chapter] = {};
    for (const [k, ev] of Object.entries(runs)) t[chapter][k] = summarise(ev);
  }
  // differences the prose quotes: what one malformed call added to a whole run
  t.toolcall.extra = {
    native:
      t.toolcall.native.input_tokens - t.toolcall.native_clean.input_tokens,
    react: t.toolcall.react.input_tokens - t.toolcall.react_clean.input_tokens,
  };
  for (const [id, tr] of Object.entries(TRACES))
    t.traces[id] = {
      calls: (tr.calls as Obj[]).length,
      status: tr.outcome.status,
      ...tr.provenance,
    };
  TREE = t;
  return t;
}

export function lookup(path: string): unknown {
  // keys may contain dots ("claude-sonnet-4.6"): at each level take the shortest run of
  // segments that names a key
  const parts = path.split(".");
  let v: unknown = tree();
  let i = 0;
  while (i < parts.length) {
    if (v === null || typeof v !== "object")
      throw new Error(`no value at "${path}"`);
    let j = i + 1;
    while (j <= parts.length && !(parts.slice(i, j).join(".") in (v as Obj)))
      j++;
    if (j > parts.length) throw new Error(`no value at "${path}"`);
    v = (v as Obj)[parts.slice(i, j).join(".")];
    i = j;
  }
  return v;
}

export function formatValue(v: unknown, fmt: Fmt): string {
  if (fmt === "raw") return String(v);
  const n = v as number;
  switch (fmt) {
    case "int":
      return fmtInt(n);
    case "tokens":
      return `${fmtInt(n)} tokens`;
    case "usd":
      return fmtUsd(n);
    case "ms":
      return fmtMs(n);
    case "pct":
      return pct(n);
    case "num":
      return trim(n);
  }
}
