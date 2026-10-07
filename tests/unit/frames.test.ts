/**
 * Frame tests (visual standard §4). Every run a chapter animates is recomputed by the vendored
 * TS engine and must equal the Python reference's run (tests/fixtures/site_fixtures.json,
 * written by scripts/make_fixtures.py from the reference at the vendored commit): every event,
 * and every animation frame. The caption the page shows for a frame, built from the
 * reference's frame, must equal the caption built from the TS frame.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  RECOVERY_TYPES,
  agentsCaption,
  budgetCaption,
  cacheCaption,
  costCaption,
  harnessCaption,
  loopCaption,
  permissionCaption,
  pipelineCaption,
  recoveryCaption,
  toolcallCaption,
} from "@/lib/agent/captions";
import {
  CHAPTER_CONFIGS,
  SWEEP_CONFIGS,
  agentsFrames,
  budgetFrames,
  cacheFrames,
  loopFrames,
  permissionFrames,
  pipelineFrames,
  runConfig,
  runSweep,
  timeline,
  toolcallFrames,
  type Chapter,
  type Ev,
  type Obj,
  type SweepName,
} from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";

const fx = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/site_fixtures.json"), "utf8"),
) as Obj;
const tok = nodeTokenizer();

const VIEWS = {
  loop: loopFrames,
  toolcall: toolcallFrames,
  budget: budgetFrames,
  cache: cacheFrames,
  permission: permissionFrames,
  timeline,
  agents: agentsFrames,
  pipeline: pipelineFrames,
} as const;

const recoveryFrames = (ev: Ev[]) =>
  ev.filter((e) => RECOVERY_TYPES.has(e.type));
const modelDur = (ev: Ev[]) =>
  ev.filter((e) => e.type === "model_call").map((e) => e.dur as number);

/** Each chapter's animation: its frames (from a run's events) and its caption. */
const ANIM: Record<
  Chapter,
  {
    frames: (ev: Ev[]) => Obj[];
    caption: (f: Obj, i: number, ev: Ev[]) => string;
  }
> = {
  loop: { frames: loopFrames, caption: (f) => loopCaption(f) },
  toolcall: { frames: toolcallFrames, caption: (f) => toolcallCaption(f) },
  budget: { frames: budgetFrames, caption: (f) => budgetCaption(f) },
  cache: { frames: cacheFrames, caption: (f, i) => cacheCaption(f, i) },
  permissions: {
    frames: permissionFrames,
    caption: (f) => permissionCaption(f),
  },
  subagents: { frames: agentsFrames, caption: (f) => agentsCaption(f) },
  hooks: { frames: pipelineFrames, caption: (f) => pipelineCaption(f) },
  recovery: { frames: recoveryFrames, caption: (f) => recoveryCaption(f) },
  harnesses: {
    frames: permissionFrames,
    caption: (f, i) => harnessCaption([{ label: "This harness", f }], i),
  },
  cost: {
    frames: cacheFrames,
    caption: (f, i, ev) => costCaption(f, i, modelDur(ev)[i]!),
  },
};

for (const chapter of Object.keys(CHAPTER_CONFIGS) as Chapter[]) {
  describe(`${chapter}: TS engine = Python reference`, () => {
    for (const [key, cfg] of Object.entries(CHAPTER_CONFIGS[chapter])) {
      it(key, () => {
        const want = fx.chapters[chapter][key] as Obj;
        const events = runConfig(cfg, tok);
        expect(events.length).toBe(want.events.length);
        events.forEach((e, k) =>
          expect(e, `event ${k} (${e.type})`).toEqual(want.events[k]),
        );
        for (const [name, fn] of Object.entries(VIEWS))
          expect(fn(events), name).toEqual(want[name]);
        // captions: every frame, and at least three key frames per animation
        const { frames, caption } = ANIM[chapter];
        const pyEv = want.events as Ev[];
        const py = frames(pyEv);
        const ts = frames(events);
        expect(py.length).toBeGreaterThanOrEqual(3);
        py.forEach((f, i) => {
          const c = caption(f, i, pyEv);
          expect(c.length).toBeGreaterThan(10);
          expect(c).toBe(caption(ts[i]!, i, events));
        });
      });
    }
  });
}

describe("seeded sweeps: TS engine = Python reference", () => {
  for (const name of Object.keys(SWEEP_CONFIGS) as SweepName[])
    it(name, () => {
      expect(runSweep(name, tok)).toEqual(fx.sweeps[name]);
    });
});

describe("captions read correctly", () => {
  const loop = fx.chapters.loop.scripted.loop as Obj[];
  it("loop: the first frame sends the whole context", () => {
    expect(loopCaption(loop[0]!)).toMatch(
      /^Turn 1: the harness sends the whole context, [\d,]+ tokens, to the model\.$/,
    );
  });
  it("loop: the last frame is the end of the run", () => {
    expect(loopCaption(loop[loop.length - 1]!)).toMatch(
      /^The run ends \(the model answered without a tool call\)/,
    );
  });
  it("toolcall: the malformed turn says why", () => {
    const f = (fx.chapters.toolcall.native.toolcall as Obj[]).find(
      (x) => x.phase === "malformed",
    )!;
    expect(toolcallCaption(f)).toContain("not valid JSON");
  });
  it("budget: compaction names the facts lost", () => {
    const f = (fx.chapters.budget["w3000-truncate"].budget as Obj[]).find(
      (x) => x.phase === "compact",
    )!;
    expect(budgetCaption(f)).toMatch(/^Truncating: .* facts lost: mem, bw\.$/);
    const o = (fx.chapters.budget["w3000-none"].budget as Obj[]).find(
      (x) => x.phase === "overflow",
    )!;
    expect(budgetCaption(o)).toMatch(/no longer fits the 3,000-token window/);
  });
  it("permissions: a denied call is not run", () => {
    const f = (fx.chapters.permissions["auto-rule"].permission as Obj[]).find(
      (x) => x.outcome === "denied",
    )!;
    expect(permissionCaption(f)).toBe(
      "run_shell(rm -rf build): deny (rule: deny run_shell(rm *)), so it is not run.",
    );
  });
  it("sub-agents: the hand-back names the report's size", () => {
    const f = (fx.chapters.subagents["subagent-roomy"].agents as Obj[]).find(
      (x) => x.phase === "return",
    )!;
    expect(agentsCaption(f)).toMatch(
      /^Sub-agent 1 is done after [\d,]+ tokens of its own work; only its [\d,]+-token report enters the parent's context\.$/,
    );
  });
  it("hooks: the sandbox and the hooks say what stopped a call", () => {
    const fr = fx.chapters.hooks["workspace-hooks"].pipeline as Obj[];
    expect(pipelineCaption(fr.find((x) => x.kind === "sandboxed")!)).toBe(
      "run_shell(pip install pytest-cov): the sandbox stops it (pip: network access is blocked by the sandbox).",
    );
    expect(pipelineCaption(fr.find((x) => x.action === "block")!)).toBe(
      "Pre-tool hook no-rm blocks the call.",
    );
    expect(pipelineCaption(fr.find((x) => x.action === "rewrite")!)).toBe(
      'Pre-tool hook quiet-tests rewrites the command to "pytest -q".',
    );
  });
  it("recovery: with no retries the loop detector stops the run", () => {
    const ev = fx.chapters.recovery["r0-stop"].events as Obj[];
    expect(recoveryCaption(ev[ev.length - 1]!)).toMatch(
      /^The run ends: stopped by loop detection, after /,
    );
  });
  it("unknown phases have no caption", () => {
    expect(agentsCaption({ phase: "x", totals: {} })).toBe("");
    expect(pipelineCaption({ stage: "x" })).toBe("");
    expect(recoveryCaption({ type: "x" })).toBe("");
    expect(loopCaption({ phase: "x" })).toBe("");
    expect(toolcallCaption({ phase: "x" })).toBe("");
    expect(budgetCaption({ phase: "x" })).toBe("");
  });
});
