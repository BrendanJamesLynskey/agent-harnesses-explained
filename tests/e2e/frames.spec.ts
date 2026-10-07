/**
 * Frame tests on the page (visual standard §4): set key frames of every animation and require
 * the caption on screen to be the caption built from the Python reference's frame
 * (tests/fixtures/site_fixtures.json).
 */
import { expect, test, type Locator } from "@playwright/test";

import fx from "../fixtures/site_fixtures.json";

import {
  budgetCaption,
  cacheCaption,
  loopCaption,
  permissionCaption,
  toolcallCaption,
} from "@/lib/agent/captions";
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
  caption: (f: Obj, i: number) => string;
  choose?: string[];
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
    const frames = CH[c.chapter][c.variant][c.view] as Obj[];
    expect(Number(await fig.getByTestId("scrub").getAttribute("max"))).toBe(
      frames.length - 1,
    );
    for (const i of keySteps(frames.length))
      await frame(fig, i, c.caption(frames[i]!, i));
  });
}
