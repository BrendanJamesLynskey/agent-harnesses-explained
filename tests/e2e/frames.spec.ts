/**
 * Frame tests on the page (visual standard §4): set key frames of every animation and require
 * the caption on screen to be the caption built from the Python reference's frame
 * (tests/fixtures/site_fixtures.json).
 */
import { expect, test, type Locator } from "@playwright/test";

import fx from "../fixtures/site_fixtures.json";

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
import { HARNESSES } from "@/lib/agent/harnesses";
import { cacheFrames, permissionFrames } from "@/lib/engine/vendor/views";
import type { Obj } from "@/lib/engine/vendor/index";

import { ENGINE_TIMEOUT } from "./pages";

// No autoplay (reduced motion): the test sets each frame itself.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const CH = (fx as Obj).chapters as Obj;

/** Change a parameter and wait until the animation has restarted for it. */
async function change(fig: Locator, act: () => Promise<void>): Promise<void> {
  const before = (await fig.getAttribute("data-key")) ?? "";
  await act();
  await expect(fig).not.toHaveAttribute("data-key", before);
}

async function frame(fig: Locator, i: number, want: string): Promise<void> {
  await fig.getByTestId("scrub").fill(String(i));
  await expect(fig).toHaveAttribute("data-step", String(i));
  await expect(fig.getByTestId("caption")).toHaveText(want);
}

function keySteps(n: number): number[] {
  return [...new Set([0, 1, Math.floor(n / 2), n - 1])];
}

const CASES: {
  path: string;
  id: string;
  chapter: string;
  variant: string;
  view: string;
  caption: (f: Obj, i: number, events: Obj[]) => string;
  choose?: string[];
  /** Frames computed from the reference's events, when the view is not stored. */
  frames?: (events: Obj[]) => Obj[];
}[] = [
  {
    path: "/learn/01-the-agent-loop",
    id: "loop-widget",
    chapter: "loop",
    variant: "scripted",
    view: "loop",
    caption: (f) => loopCaption(f),
  },
  {
    path: "/learn/01-the-agent-loop",
    id: "loop-widget",
    chapter: "loop",
    variant: "qwen-fix-test-react",
    view: "loop",
    caption: (f) => loopCaption(f),
    choose: ["Qwen: fix (ReAct)"],
  },
  {
    path: "/learn/02-tool-calling",
    id: "toolcall-widget",
    chapter: "toolcall",
    variant: "native",
    view: "toolcall",
    caption: (f) => toolcallCaption(f),
  },
  {
    path: "/learn/02-tool-calling",
    id: "toolcall-widget",
    chapter: "toolcall",
    variant: "react",
    view: "toolcall",
    caption: (f) => toolcallCaption(f),
    choose: ["ReAct text"],
  },
  {
    path: "/learn/03-the-context-budget",
    id: "budget-widget",
    chapter: "budget",
    variant: "w3000-summarise",
    view: "budget",
    caption: (f) => budgetCaption(f),
  },
  {
    path: "/learn/03-the-context-budget",
    id: "budget-widget",
    chapter: "budget",
    variant: "w3000-truncate",
    view: "budget",
    caption: (f) => budgetCaption(f),
    choose: ["truncate"],
  },
  {
    path: "/learn/04-prompt-caching",
    id: "cache-widget",
    chapter: "cache",
    variant: "stable-claude-sonnet-4.6",
    view: "cache",
    caption: (f, i) => cacheCaption(f, i),
  },
  {
    path: "/learn/04-prompt-caching",
    id: "cache-widget",
    chapter: "cache",
    variant: "timestamp-gpt-5-mini",
    view: "cache",
    caption: (f, i) => cacheCaption(f, i),
    choose: ["time in system prompt", "GPT-5 mini"],
  },
  {
    path: "/learn/05-permissions",
    id: "permission-widget",
    chapter: "permissions",
    variant: "default-rule",
    view: "permission",
    caption: (f) => permissionCaption(f),
  },
  {
    path: "/learn/05-permissions",
    id: "permission-widget",
    chapter: "permissions",
    variant: "ask-norule",
    view: "permission",
    caption: (f) => permissionCaption(f),
    choose: ["ask every time", "no rules"],
  },
  {
    path: "/learn/06-sub-agents",
    id: "subagent-widget",
    chapter: "subagents",
    variant: "subagent-roomy",
    view: "agents",
    caption: (f) => agentsCaption(f),
  },
  {
    path: "/learn/06-sub-agents",
    id: "subagent-widget",
    chapter: "subagents",
    variant: "inline-tight",
    view: "agents",
    caption: (f) => agentsCaption(f),
    choose: ["inline", "3,000, summarising"],
  },
  {
    path: "/learn/07-hooks-and-sandboxing",
    id: "hooks-widget",
    chapter: "hooks",
    variant: "workspace-hooks",
    view: "pipeline",
    caption: (f) => pipelineCaption(f),
  },
  {
    path: "/learn/07-hooks-and-sandboxing",
    id: "hooks-widget",
    chapter: "hooks",
    variant: "read_only-nohooks",
    view: "pipeline",
    caption: (f) => pipelineCaption(f),
    choose: ["read-only", "no hooks"],
  },
  {
    path: "/learn/08-failure-and-recovery",
    id: "recovery-widget",
    chapter: "recovery",
    variant: "r0-stop",
    view: "events",
    caption: (f) => recoveryCaption(f),
    frames: (ev) => ev.filter((e) => RECOVERY_TYPES.has(e.type as string)),
  },
  {
    path: "/learn/08-failure-and-recovery",
    id: "recovery-widget",
    chapter: "recovery",
    variant: "r2-nudge",
    view: "events",
    caption: (f) => recoveryCaption(f),
    frames: (ev) => ev.filter((e) => RECOVERY_TYPES.has(e.type as string)),
    choose: ["2", "nudge the model"],
  },
  {
    path: "/learn/10-cost-and-latency",
    id: "cost-widget",
    chapter: "cost",
    variant: "fix_test-claude-sonnet-4.6-hosted-cache-auto",
    view: "cache",
    caption: (f, i, ev) =>
      costCaption(f, i, ev.filter((e) => e.type === "model_call")[i]!.dur),
  },
  {
    path: "/learn/10-cost-and-latency",
    id: "cost-widget",
    chapter: "cost",
    variant: "research_subagent-gpt-5-mini-hosted-cache-auto",
    view: "cache",
    caption: (f, i, ev) =>
      costCaption(f, i, ev.filter((e) => e.type === "model_call")[i]!.dur),
    frames: (ev) => cacheFrames(ev as never),
    choose: ["notes, sub-agent", "GPT-5 mini"],
  },
];

for (const c of CASES) {
  test(`${c.id} ${c.variant}: page captions are the reference's`, async ({
    page,
  }) => {
    await page.goto(c.path);
    const fig = page.getByTestId(c.id);
    await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
    for (const label of c.choose ?? [])
      await change(fig, () =>
        fig.getByRole("radio", { name: label, exact: true }).click(),
      );
    const events = CH[c.chapter][c.variant].events as Obj[];
    const frames = c.frames
      ? c.frames(events)
      : (CH[c.chapter][c.variant][c.view] as Obj[]);
    expect(Number(await fig.getByTestId("scrub").getAttribute("max"))).toBe(
      frames.length - 1,
    );
    for (const i of keySteps(frames.length))
      await frame(fig, i, c.caption(frames[i]!, i, events));
  });
}

test("harnesses-widget: page captions are the reference's, across all six runs", async ({
  page,
}) => {
  await page.goto("/learn/09-harnesses-compared");
  const fig = page.getByTestId("harnesses-widget");
  await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
  const rows = HARNESSES.map((h) => ({
    label: h.label,
    frames: permissionFrames(CH.harnesses[h.key].events as never) as Obj[],
  }));
  const n = rows[0]!.frames.length;
  expect(Number(await fig.getByTestId("scrub").getAttribute("max"))).toBe(
    n - 1,
  );
  for (const i of keySteps(n))
    await frame(
      fig,
      i,
      harnessCaption(
        rows.map((r) => ({ label: r.label, f: r.frames[i]! })),
        i,
      ),
    );
});
