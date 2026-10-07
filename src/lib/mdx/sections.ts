/**
 * Chapter catalogue + filesystem loader for /learn content.
 *
 * MDX sources live under `/content/chapters/`, one per mechanism, each built
 * around an animation. Their slugs and order are defined here (single source
 * of truth); the `[slug]` route validates incoming params against this list
 * before reading from disk. Same shape as the companion sites'
 * `src/lib/mdx/sections.ts`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SECTIONS = [
  {
    slug: "01-the-agent-loop",
    title: "The agent loop",
    summary:
      "Model, tool call, result, model again: the loop a harness runs, and the context window filling as it goes.",
  },
  {
    slug: "02-tool-calling",
    title: "Tool calling",
    summary:
      "JSON Schema in, a structured call out: what the model actually sees and writes, natively and as ReAct text, and what happens when a call is malformed.",
  },
  {
    slug: "03-the-context-budget",
    title: "The context window as a budget",
    summary:
      "System prompt, tools, history and tool results share one window; when it fills, truncation, clipping or summarising decide what is kept and what is lost.",
  },
  {
    slug: "04-prompt-caching",
    title: "Prompt caching",
    summary:
      "A stable prefix is read from the cache at a tenth of the price; a timestamp or a reordered tool list breaks it.",
  },
  {
    slug: "05-permissions",
    title: "Permissions and the human in the loop",
    summary:
      "Allow, ask and deny rules evaluated against every call; each question to the human adds their thinking time to the run.",
  },
] as const;

export type SectionSlug = (typeof SECTIONS)[number]["slug"];

const SLUG_SET = new Set<string>(SECTIONS.map((s) => s.slug));

export function isValidSlug(slug: string): slug is SectionSlug {
  return SLUG_SET.has(slug);
}

export function getSectionMeta(slug: SectionSlug): (typeof SECTIONS)[number] {
  return SECTIONS.find((s) => s.slug === slug) ?? SECTIONS[0];
}

/** Read the raw MDX source for a chapter, or `null` if it doesn't exist. */
export async function readSectionMdx(
  slug: SectionSlug,
): Promise<string | null> {
  const path = join(process.cwd(), "content", "chapters", `${slug}.mdx`);
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
