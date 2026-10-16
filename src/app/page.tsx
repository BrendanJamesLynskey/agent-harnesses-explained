import type { Route } from "next";
import Link from "next/link";

import { CheckedStrip, StartButton } from "@/components/ui/Landing";
import { TurnBars } from "@/components/viz/TurnBars";
import { formatValue, lookup } from "@/lib/agent/values";
import { SECTIONS } from "@/lib/mdx/sections";
import { ENGINE_URL } from "@/lib/site";
import { ReadingOrder } from "@/components/ui/ReadingOrder";

const LINK =
  "focus-ring rounded underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

/**
 * Landing page: what the site is, the picture behind every chapter (the context re-sent on
 * each turn, to scale, computed by the engine at build time), and the ways in. Server
 * Component with no client JavaScript of its own.
 */
export default function HomePage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        Agent Harnesses Explained
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        What sits between a model and the world.
      </h1>
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            An interactive guide to the agent harness: the loop, the tools,
            permissions and context management around a model, animated by a
            tested simulator.
          </p>
          <div className="mt-6">
            <StartButton href={`/learn/${SECTIONS[0]!.slug}` as Route} />
          </div>
        </div>
        <figure
          data-hero-figure
          className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <TurnBars />
          <figcaption className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            The context sent to the model on each turn of the scripted run, in
            tokens, to scale. The whole conversation goes every time.
          </figcaption>
        </figure>
      </div>
      <CheckedStrip href="/about#engine">
        Agent_Loop_Sim&apos;s Python reference and the TypeScript port in your
        browser produce the same events, token for token and float for float,
        and three recorded runs of a small open-weights model are replayed token
        for token.
      </CheckedStrip>
      <section aria-labelledby="learn-heading" className="mt-12">
        <h2 id="learn-heading" className="text-xl font-semibold tracking-tight">
          What you&apos;ll learn
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
          A chat model only writes text. The <strong>harness</strong> around it
          turns that into an agent: it runs the loop, describes the tools,
          parses the calls, decides which ones may run, keeps the context inside
          the window and the prompt cache warm. To fix one failing test, a
          scripted agent here makes {v("loop.scripted.turns", "int")} model
          calls and sends the model {v("loop.scripted.input_tokens", "tokens")}{" "}
          to write {v("loop.scripted.output_tokens", "tokens")}.
        </p>
        <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
          Each chapter takes one of the harness&apos;s choices apart, built
          around an animation. Every frame comes from{" "}
          <a href={ENGINE_URL} className={LINK}>
            Agent_Loop_Sim
          </a>
          , a deterministic simulator with a real tokenizer, tested against its
          Python reference. Nothing here calls a live model: the scripted runs
          are reproducible, and three runs of a small open-weights model were{" "}
          <Link href="/traces" className={LINK}>
            recorded once
          </Link>{" "}
          and are replayed token for token, failures and all.
        </p>
      </section>
      <ReadingOrder current="harnesses" />
      <nav
        aria-label="Chapters"
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SECTIONS.map((s, i) => (
          <Link
            key={s.slug}
            href={`/learn/${s.slug}`}
            className="focus-ring group rounded-lg border border-neutral-200 p-5 hover:border-accent dark:border-neutral-800 dark:hover:border-indigo-400"
          >
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {s.summary}
            </p>
          </Link>
        ))}
      </nav>
      <p className="mt-12 text-sm text-neutral-600 dark:text-neutral-400">
        Part of a family of sixteen companion sites in four tracks, all in the
        site menu above: Foundations (
        <a
          href="https://transformer-decoder-explained.vercel.app"
          className={LINK}
        >
          Decoder
        </a>
        ,{" "}
        <a
          href="https://transformer-training-explained.vercel.app"
          className={LINK}
        >
          Training
        </a>
        ), Hardware (
        <a href="https://gpu-kernels-explained.vercel.app" className={LINK}>
          Kernels
        </a>
        ,{" "}
        <a href="https://systolic-arrays-explained.vercel.app" className={LINK}>
          Systolic
        </a>
        ,{" "}
        <a href="https://ai-accelerators-explained.vercel.app" className={LINK}>
          Accelerators
        </a>
        ,{" "}
        <a href="https://ai-racks-explained.vercel.app" className={LINK}>
          Racks
        </a>
        ), Inference (
        <a href="https://llm-inference-explained.vercel.app" className={LINK}>
          Serving
        </a>
        ,{" "}
        <a
          href="https://llm-architectures-explained.vercel.app"
          className={LINK}
        >
          Architectures
        </a>
        ,{" "}
        <a href="https://numerics-explained.vercel.app" className={LINK}>
          Numerics
        </a>
        ,{" "}
        <a
          href="https://inference-tradeoffs-explained.vercel.app"
          className={LINK}
        >
          Trade-offs
        </a>
        ) and Agents (<strong className="font-medium">Harnesses</strong>,{" "}
        <a href="https://agent-protocols-explained.vercel.app" className={LINK}>
          Protocols
        </a>
        ,{" "}
        <a href="https://agent-context-explained.vercel.app" className={LINK}>
          Context
        </a>
        ,{" "}
        <a
          href="https://agent-orchestration-explained.vercel.app"
          className={LINK}
        >
          Orchestration
        </a>
        ,{" "}
        <a href="https://agent-evals-explained.vercel.app" className={LINK}>
          Evals
        </a>
        ,{" "}
        <a href="https://agent-security-explained.vercel.app" className={LINK}>
          Security
        </a>
        ). It is the first of the six agent sites. How this one was built, and
        how to check it:{" "}
        <Link href="/about" className={LINK}>
          about
        </Link>
        .
      </p>
    </main>
  );
}
