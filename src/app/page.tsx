import Link from "next/link";

import { TurnBars } from "@/components/viz/TurnBars";
import { formatValue, lookup } from "@/lib/agent/values";
import { SECTIONS } from "@/lib/mdx/sections";
import {
  ARCHITECTURES_URL,
  DECODER_URL,
  ENGINE_URL,
  INFERENCE_URL,
  KERNELS_URL,
  NUMERICS_URL,
  PROTOCOLS_URL,
  SILICON_URL,
  TRADEOFFS_URL,
} from "@/lib/site";

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
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            A chat model only writes text. The <strong>harness</strong> around
            it turns that into an agent: it runs the loop, describes the tools,
            parses the calls, decides which ones may run, keeps the context
            inside the window and the prompt cache warm. To fix one failing
            test, a scripted agent here makes {v("loop.scripted.turns", "int")}{" "}
            model calls and sends the model{" "}
            {v("loop.scripted.input_tokens", "tokens")} to write{" "}
            {v("loop.scripted.output_tokens", "tokens")}.
          </p>
          <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
            Each chapter takes one of the harness&apos;s choices apart, built
            around an animation. Every frame comes from{" "}
            <a href={ENGINE_URL} className={LINK}>
              Agent_Loop_Sim
            </a>
            , a deterministic simulator with a real tokenizer, tested against
            its Python reference. Nothing here calls a live model: the scripted
            runs are reproducible, and three runs of a small open-weights model
            were{" "}
            <Link href="/traces" className={LINK}>
              recorded once
            </Link>{" "}
            and are replayed token for token, failures and all.
          </p>
        </div>
        <figure className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <TurnBars />
          <figcaption className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            The context sent to the model on each turn of the scripted run, in
            tokens, to scale. The whole conversation goes every time.
          </figcaption>
        </figure>
      </div>
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
        The first of a family of agent sites, followed by{" "}
        <a href={PROTOCOLS_URL} className={LINK}>
          Agent Protocols Explained
        </a>
        , alongside the LLM-systems sites: the{" "}
        <a href={DECODER_URL} className={LINK}>
          Transformer Decoder Explainer
        </a>
        ,{" "}
        <a href={INFERENCE_URL} className={LINK}>
          LLM Inference Explained
        </a>
        ,{" "}
        <a href={ARCHITECTURES_URL} className={LINK}>
          LLM Architectures Explained
        </a>
        ,{" "}
        <a href={KERNELS_URL} className={LINK}>
          GPU Kernels Explained
        </a>
        ,{" "}
        <a href={NUMERICS_URL} className={LINK}>
          Numerics Explained
        </a>
        ,{" "}
        <a href={SILICON_URL} className={LINK}>
          Systolic Arrays Explained
        </a>{" "}
        and{" "}
        <a href={TRADEOFFS_URL} className={LINK}>
          Inference Trade-offs Explained
        </a>
        . How this one was built, and how to check it:{" "}
        <Link href="/about" className={LINK}>
          about
        </Link>
        .
      </p>
    </main>
  );
}
