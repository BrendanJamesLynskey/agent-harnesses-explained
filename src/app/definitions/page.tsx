/**
 * /definitions — the shared definitions (brief 44C): the terms the sixteen
 * companion sites define differently, or assume, each with one definition,
 * one formula in one notation (KaTeX, rendered on the server), the chapters
 * that use it, and where a site differs, why. Hosted on Harnesses and linked
 * from every site's About page or glossary. Server Component.
 */
import Link from "next/link";

import { Eq } from "@/components/mdx/Eq";
import { DEFINITIONS } from "@/lib/learn/definitions";
import { withShare } from "@/lib/share";

import "katex/dist/katex.min.css";

export const metadata = withShare("/definitions", {
  title: "Shared definitions",
  description:
    "One definition and one formula for the terms the sixteen companion sites use differently or assume: KV cache, TTFT and TPOT, goodput, the pipeline bubble, the roofline, MFU, INT ranges, the prompt cache's ρ, context rot, percentiles and more.",
});

const LINK =
  "focus-ring rounded text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent dark:text-indigo-300";

export default function DefinitionsPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        All four tracks
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Shared definitions
      </h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-300">
        The sixteen companion sites were written one at a time, and a few terms
        came out meaning slightly different things, or written in different
        symbols. Here each gets one definition and one formula, in one notation,
        with the chapters that use it. Where a site&rsquo;s own wording or
        notation differs, the entry says how and why; the site&rsquo;s chapter
        is still right in its own terms.
      </p>

      <nav aria-label="Terms" className="mt-8">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {DEFINITIONS.map((d) => (
            <li key={d.id}>
              <a href={`#${d.id}`} className={LINK}>
                {d.term}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-12" data-definitions>
        {DEFINITIONS.map((d) => (
          <section
            key={d.id}
            id={d.id}
            aria-labelledby={`${d.id}-heading`}
            className="scroll-mt-20 border-t border-neutral-200 pt-8 dark:border-neutral-800"
          >
            <h2
              id={`${d.id}-heading`}
              className="text-xl font-semibold tracking-tight"
            >
              {d.term}
            </h2>
            <p className="mt-3 text-neutral-700 dark:text-neutral-300">
              {d.definition}
            </p>
            <div className="mt-4 min-w-0 overflow-x-auto">
              <Eq tex={d.tex} label={d.say} />
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {d.symbols}
            </p>
            <h3 className="mt-4 text-sm font-semibold">Where it is used</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-neutral-700 dark:text-neutral-300">
              {d.uses.map((u) => (
                <li key={u.href + u.what}>
                  <span className="font-medium">{u.site}</span>:{" "}
                  {u.href.startsWith("/") ? (
                    <Link href={u.href} className={LINK}>
                      {u.what}
                    </Link>
                  ) : (
                    <a href={u.href} className={LINK}>
                      {u.what}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {d.differs && (
              <p
                data-differs
                className="mt-4 rounded border-l-4 border-amber-500 bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <span className="font-semibold">Where a site differs: </span>
                {d.differs}
              </p>
            )}
            {d.source && (
              <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
                Source:{" "}
                <a href={d.source.href} className={LINK}>
                  {d.source.label}
                </a>
              </p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
