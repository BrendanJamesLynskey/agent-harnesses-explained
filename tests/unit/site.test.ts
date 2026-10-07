/**
 * The small modules around the engine: number formats, captions for the rarer frames, the
 * palette, the chapter catalogue and the site constants.
 */
import { describe, expect, it } from "vitest";

import { loopCaption, permissionCaption } from "@/lib/agent/captions";
import { KIND_ORDER } from "@/lib/engine";
import {
  clip,
  fmtInt,
  fmtMs,
  fmtTokens,
  fmtUsd,
  pct,
  trim,
} from "@/lib/format";
import {
  SECTIONS,
  getSectionMeta,
  isValidSlug,
  readSectionMdx,
} from "@/lib/mdx/sections";
import { GITHUB_URL, SITE_URL, repoFile } from "@/lib/site";
import {
  HATCHED_KINDS,
  KIND_COLOUR,
  KIND_NAME,
  LANE_COLOUR,
} from "@/lib/viz/palette";

describe("format", () => {
  it("durations", () => {
    expect(fmtMs(0)).toBe("0 s");
    expect(fmtMs(850)).toBe("850 ms");
    expect(fmtMs(12345)).toBe("12.3 s");
    expect(fmtMs(125_000)).toBe("2 min 5 s");
    expect(fmtMs(119_800)).toBe("2 min 0 s");
  });
  it("money, counts, percentages, clipping", () => {
    expect(fmtUsd(0)).toBe("$0");
    expect(fmtUsd(0.00236)).toBe("$0.00236");
    expect(fmtUsd(1.234)).toBe("$1.23");
    expect(fmtTokens(4342)).toBe("4,342 tokens");
    expect(fmtInt(1234.4)).toBe("1,234");
    expect(pct(0.531)).toBe("53%");
    expect(trim(0)).toBe("0");
    expect(clip("short")).toBe("short");
    expect(clip("a few words that will not fit in the space", 20)).toBe(
      "a few words that…",
    );
    expect(clip("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });
});

describe("captions for rarer frames", () => {
  it("loop: compaction and a loop error", () => {
    expect(loopCaption({ phase: "compact", before: 2040, after: 1513 })).toBe(
      "Compaction: the context shrinks from 2,040 to 1,513 tokens.",
    );
    expect(
      loopCaption({
        phase: "error",
        turn: 3,
        kind: "loop",
        detail: "the same call 3 times in a row",
      }),
    ).toBe("Turn 3: the same call 3 times in a row.");
  });
  it("permissions: blocked by a hook, and a call that runs but fails", () => {
    const base = {
      name: "run_shell",
      subject: "rm -rf build",
      decision: "allow",
      reason: "mode: auto",
    };
    expect(permissionCaption({ ...base, outcome: "blocked" })).toMatch(
      /a hook blocks it\.$/,
    );
    expect(permissionCaption({ ...base, outcome: "transient" })).toMatch(
      /it runs but fails\.$/,
    );
    expect(permissionCaption({ ...base, subject: "", outcome: "ok" })).toBe(
      "run_shell(): allow (mode: auto), so it runs.",
    );
  });
});

describe("palette", () => {
  it("every kind of context has a colour and a name", () => {
    for (const k of KIND_ORDER) {
      expect(KIND_COLOUR[k], k).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(KIND_NAME[k], k).toBeTruthy();
    }
    expect(HATCHED_KINDS.has("error")).toBe(true);
    expect(Object.keys(LANE_COLOUR)).toEqual([
      "model",
      "tool",
      "human",
      "retry",
    ]);
  });
});

describe("chapters and site", () => {
  it("catalogue", async () => {
    expect(SECTIONS).toHaveLength(5);
    expect(isValidSlug("01-the-agent-loop")).toBe(true);
    expect(isValidSlug("99-nope")).toBe(false);
    expect(getSectionMeta("02-tool-calling").title).toBe("Tool calling");
    expect(await readSectionMdx("01-the-agent-loop")).toMatch(/^<LoopWidget>/);
  });
  it("constants", () => {
    expect(SITE_URL).toBe("https://agent-harnesses-explained.vercel.app");
    expect(repoFile("README.md")).toBe(`${GITHUB_URL}/blob/main/README.md`);
  });
});
