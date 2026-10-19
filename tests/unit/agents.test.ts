/**
 * The Agents track's start page and the shared definitions (brief 44C): the
 * six sites in order; every glossary link names a chapter and an anchor on
 * one of the six sites (and this site's exist); every definition's formula
 * compiles, its ids are unique, and its links are either this site's pages
 * or https links to the companion sites.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import katex from "katex";
import { describe, expect, it } from "vitest";

import { AGENT_GLOSSARY, AGENT_SITES, HARNESSES } from "@/lib/learn/agents";
import { DEFINITIONS } from "@/lib/learn/definitions";
import { SECTIONS } from "@/lib/mdx/sections";

const DIR = path.resolve(__dirname, "../../content/chapters");
const slugs = new Set<string>(SECTIONS.map((s) => s.slug));
const chapter = (slug: string) =>
  readFileSync(path.join(DIR, `${slug}.mdx`), "utf8");

describe("the Agents start page", () => {
  it("lists the six sites in reading order", () => {
    expect(AGENT_SITES.map((s) => s.name)).toEqual([
      "Harnesses",
      "Protocols",
      "Context",
      "Orchestration",
      "Evals",
      "Security",
    ]);
    for (const s of AGENT_SITES) expect(s.url).toMatch(/^https:\/\/.+\/learn$/);
  });

  it("links every term to a chapter section; this site's anchors exist", () => {
    expect(AGENT_GLOSSARY.length).toBeGreaterThanOrEqual(30);
    const terms = AGENT_GLOSSARY.map((g) => g.term);
    expect(new Set(terms).size).toBe(terms.length);
    for (const g of AGENT_GLOSSARY) {
      const m =
        /^(https:\/\/agent-[a-z]+-explained\.vercel\.app)\/learn\/([\w-]+)#([\w-]+)$/.exec(
          g.href,
        );
      expect(m, g.href).not.toBeNull();
      if (m![1] !== HARNESSES) continue;
      expect(slugs.has(m![2]!), g.href).toBe(true);
      expect(chapter(m![2]!), g.href).toContain(`id="${m![3]}"`);
    }
  });
});

describe("the shared definitions", () => {
  it("has unique ids and at least the brief's terms", () => {
    const ids = DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "bubble",
      "goodput",
      "int-range",
      "mfu",
      "roofline",
      "ttft-tpot",
      "kv-cache",
      "cache-rho",
      "context-rot",
    ])
      expect(ids).toContain(id);
  });

  it.each(DEFINITIONS.map((d) => [d.id, d]))(
    "%s compiles and links",
    (_id, d) => {
      expect(() =>
        katex.renderToString(d.tex, {
          displayMode: true,
          throwOnError: true,
          strict: "ignore",
        }),
      ).not.toThrow();
      expect(d.definition.length).toBeGreaterThan(60);
      expect(d.say.length).toBeGreaterThan(10);
      expect(d.uses.length).toBeGreaterThanOrEqual(2);
      for (const u of d.uses) {
        if (u.href.startsWith("/learn/")) {
          expect(slugs.has(u.href.slice(7)), u.href).toBe(true);
          continue;
        }
        expect(u.href, u.href).toMatch(
          /^https:\/\/[a-z-]+\.vercel\.app\/(learn|training)\/[\w-]+(#[\w-]+)?$/,
        );
      }
    },
  );
});
