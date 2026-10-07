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
  SCENARIOS,
  TRACES,
  SWEEP_CONFIGS,
  cacheFrames,
  runChapter,
  runSweep,
  verified,
  type Chapter,
  type Ev,
  type Obj,
  type SweepName,
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
  // per agent: tokens sent to the model, peak context, model time
  const agent = (a: string) => {
    const calls = ev.filter((e) => e.type === "model_call" && e.agent === a);
    const act = calls.filter((e) => e.purpose === "act");
    return {
      input: calls.reduce((x, e) => x + (e.input_tokens as number), 0),
      cost: calls.reduce((x, e) => x + (e.cost as number), 0),
      peak: act.length
        ? Math.max(...act.map((e) => e.input_tokens as number))
        : 0,
      busy: calls.reduce((x, e) => x + (e.dur as number), 0),
      turns: act.length,
    };
  };
  const ret = ev.find((e) => e.type === "handoff" && e.direction === "return");
  const spawn = ev.find((e) => e.type === "handoff" && e.direction === "spawn");
  const results = ev.filter((e) => e.type === "tool_result");
  return {
    ...bad,
    main: agent("main"),
    sub1: agent("sub1"),
    child_tokens: ret ? ret.child_tokens : 0,
    summary_tokens: ret ? ret.summary_tokens : 0,
    spawn_prompt_tokens: spawn ? spawn.prompt_tokens : 0,
    sub_elapsed: ret && spawn ? (ret.t as number) - (spawn.t as number) : 0,
    sandboxed: results.filter((e) => e.kind === "sandboxed").length,
    hooks: ev.filter((e) => e.type === "hook").length,
    verified: verified(ev) ? "yes" : "no",
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
const SWEEPS = new Map<SweepName, Record<string, Obj[]>>();

/** A seeded sweep, computed once on the server (chapter 8's chart). */
export function serverSweep(name: SweepName): Record<string, Obj[]> {
  let r = SWEEPS.get(name);
  if (!r) {
    r = runSweep(name, nodeTokenizer());
    SWEEPS.set(name, r);
  }
  return r;
}
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
  // seeded sweeps, by policy key and retry budget (rows in budget order)
  t.sweeps = {};
  for (const name of Object.keys(SWEEP_CONFIGS) as SweepName[])
    t.sweeps[name] = serverSweep(name);
  // chapter 8: the analytic model beside the sweep. Each shell attempt fails with
  // probability p (the scenario's fail rate); a call fails after r retries with q = p^(r+1);
  // the scripted model repeats a failed call, and three identical calls in a row are a loop,
  // so one test step is lost only if two calls in a row fail: the run (two test steps)
  // succeeds with (1 - q^2)^2. Worst-case back-off: b (f^r - 1) / (f - 1).
  {
    const p = (SCENARIOS.fix_test_flaky!.fail_rates as Obj).run_shell as number;
    const rec = DEFAULT_POLICY.recovery as Obj;
    t.recovery.model = { p };
    for (const r of SWEEP_CONFIGS.recovery.budgets) {
      const q = p ** (r + 1);
      t.recovery.model[r] = {
        call: 1 - q,
        run: (1 - q * q) ** 2,
        backoff:
          (rec.backoff_ms * (rec.backoff_factor ** r - 1)) /
          (rec.backoff_factor - 1),
      };
    }
  }
  // chapter 6: what the sub-agent saved and what it cost
  for (const w of ["roomy", "tight"]) {
    const a = t.subagents[`inline-${w}`];
    const b = t.subagents[`subagent-${w}`];
    t.subagents[`diff-${w}`] = {
      peak_saved: a.main.peak - b.main.peak,
      peak_ratio: b.main.peak / a.main.peak,
      input_saved: a.input_tokens - b.input_tokens,
      extra_time: b.elapsed - a.elapsed,
      extra_cost: b.cost - a.cost,
    };
  }
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
