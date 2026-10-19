/**
 * /agents — the Agents track's start page (brief 44): the six sites in
 * reading order, what to know first, how a chapter works (layers,
 * self-checks, what to remember), a glossary whose terms link to the chapter
 * section that defines each one, on whichever site defines it, and the
 * shared definitions page. Hosted here because Harnesses is the track's first
 * site. Server Component, no client JavaScript.
 */
import Link from "next/link";

import { ReadingOrder } from "@/components/learn/ReadingOrder";
import {
  AGENT_GLOSSARY as GLOSSARY,
  AGENT_SITES,
  FOUNDATIONS,
} from "@/lib/learn/agents";
import { withShare } from "@/lib/share";
import { AGENTS_HUB, INFERENCE_URL } from "@/lib/site";

export const metadata = withShare("/agents", {
  title: "Agents: start here",
  description:
    "The Agents track's start page: Harnesses, Protocols, Context, Orchestration, Evals and Security in reading order, what you need to know first, and a glossary of the terms they define.",
});

const LINK =
  "focus-ring rounded text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent dark:text-indigo-300";

export default function AgentsPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        Agents track
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Start here: what turns a model into an agent
      </h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-300">
        Six sites, one engine. Harnesses takes apart the loop around one model;
        Protocols follows its tool calls onto the wire; Context decides what
        goes into the window; Orchestration runs many steps and many agents as a
        graph; Evals asks how good the result is, and how sure you can be;
        Security makes the dangerous flows impossible by design. Read them in
        order, or start anywhere and follow the links back.
      </p>

      <ReadingOrder
        track="Agents"
        intro="Each site's chapters build on each other; start at chapter 1 of Harnesses. Every number is computed by the same tested simulator, Agent_Loop_Sim, or replayed from a recording."
        sites={AGENT_SITES}
        current="harnesses"
      />

      <section aria-labelledby="prereq-heading" className="mt-12">
        <h2
          id="prereq-heading"
          className="text-xl font-semibold tracking-tight"
        >
          What you need first
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-neutral-700 dark:text-neutral-300">
          <li>
            <strong>What a language model call is.</strong> Text in, tokens out,
            one token at a time, priced per million tokens. The{" "}
            <a href={FOUNDATIONS} className={LINK}>
              Foundations track
            </a>{" "}
            (Decoder and Training) shows what happens inside; the Agents sites
            treat the model as a box.
          </li>
          <li>
            <strong>Tokens and the context window.</strong> That a prompt is
            counted in tokens, that it has a maximum length, and that the model
            reads all of it on every call.{" "}
            <a href={INFERENCE_URL} className={LINK}>
              LLM Inference Explained
            </a>{" "}
            covers what that costs on the server.
          </li>
          <li>
            <strong>A little probability.</strong> Rates, independent events and
            an average; Evals and Orchestration build the rest (intervals,
            percentiles, Little&rsquo;s law) as they go.
          </li>
          <li>
            <strong>Reading code is optional.</strong> The Code layer shows the
            engine&rsquo;s TypeScript, cut from the tested source, and where it
            helps a snippet for a real SDK; hide it with the layer switch.
          </li>
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="mt-12">
        <h2 id="how-heading" className="text-xl font-semibold tracking-tight">
          How a chapter works
        </h2>
        <p className="mt-4 text-neutral-700 dark:text-neutral-300">
          A chapter opens with an animation of its mechanism, run by the engine
          (a simulated agent, or a recorded one replayed token for token), then
          explains it in three layers you can switch on and off: Concept (words
          and pictures), Maths (the formulas) and Code (the code that runs). It
          ends with <strong>Check yourself</strong>, three questions to commit
          to before you reveal the answers (the numbers come from the same
          engine), and <strong>What to remember</strong>, the chapter in a few
          lines.
        </p>
        <p className="mt-4 text-neutral-700 dark:text-neutral-300">
          Some terms mean different things on different sites (goodput, ρ, the
          pipeline bubble). The{" "}
          <Link href="/definitions" className={LINK} data-definitions-link>
            shared definitions
          </Link>{" "}
          give each one definition and one formula, and say where a site
          differs. The{" "}
          <a href={AGENTS_HUB} className={LINK}>
            Agents slide series
          </a>{" "}
          goes deeper on every chapter.
        </p>
      </section>

      <section aria-labelledby="glossary-heading" className="mt-12">
        <h2
          id="glossary-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Glossary
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Each term links to the section that defines it, on the site that
          defines it.
        </p>
        <dl
          data-track-glossary
          className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800"
        >
          {GLOSSARY.map((g) => (
            <div key={g.term} className="py-2 sm:flex sm:gap-4">
              <dt className="font-medium sm:w-56 sm:shrink-0">
                <a href={g.href} className={LINK}>
                  {g.term}
                </a>
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-400">
                {g.what}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
