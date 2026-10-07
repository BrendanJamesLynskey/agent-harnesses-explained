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
  budgetCaption,
  cacheCaption,
  loopCaption,
  permissionCaption,
  toolcallCaption,
} from "@/lib/agent/captions";
import {
  CHAPTER_CONFIGS,
  budgetFrames,
  cacheFrames,
  loopFrames,
  permissionFrames,
  runConfig,
  timeline,
  toolcallFrames,
  type Chapter,
  type Obj,
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
} as const;

/** Each chapter's animation: its frames and its caption. */
const ANIM: Record<
  Chapter,
  { view: keyof typeof VIEWS; caption: (f: Obj, i: number) => string }
> = {
  loop: { view: "loop", caption: (f) => loopCaption(f) },
  toolcall: { view: "toolcall", caption: (f) => toolcallCaption(f) },
  budget: { view: "budget", caption: (f) => budgetCaption(f) },
  cache: { view: "cache", caption: (f, i) => cacheCaption(f, i) },
  permissions: { view: "permission", caption: (f) => permissionCaption(f) },
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
        const { view, caption } = ANIM[chapter];
        const py = want[view] as Obj[];
        const ts = VIEWS[view](events) as Obj[];
        expect(py.length).toBeGreaterThanOrEqual(3);
        py.forEach((f, i) => {
          const c = caption(f, i);
          expect(c.length).toBeGreaterThan(10);
          expect(c).toBe(caption(ts[i]!, i));
        });
      });
    }
  });
}

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
  it("unknown phases have no caption", () => {
    expect(loopCaption({ phase: "x" })).toBe("");
    expect(toolcallCaption({ phase: "x" })).toBe("");
    expect(budgetCaption({ phase: "x" })).toBe("");
  });
});
