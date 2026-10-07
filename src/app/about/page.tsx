/**
 * /about: what the site is, what the engine computes and what it leaves out, how the
 * animations are driven and checked, and where the design came from. Server Component, static.
 */
import Link from "next/link";

import { formatValue, lookup } from "@/lib/agent/values";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import {
  AGENTS_HUB,
  CODING_AGENTS_HUB,
  DECODER_URL,
  ENGINE_URL,
  GITHUB_URL,
  INFERENCE_URL,
  KERNELS_URL,
  TRADEOFFS_URL,
  repoFile,
} from "@/lib/site";

export const metadata = {
  title: "About",
  description:
    "What Agent Harnesses Explained's engine simulates, what is illustrative, and how the engine, its replays and its animations are checked.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";

export default function AboutPage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /about
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        About this site
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Agent Harnesses Explained takes apart the program that turns a chat
          model into an agent: the loop, the tool calls, the context budget,
          prompt caching, permissions, sub-agents, hooks and sandboxing, failure
          and recovery, the public harnesses compared, and the cost and latency
          of a task, one chapter each, each around an animation. It is the first
          of a family of agent sites, next to the LLM-systems sites (the{" "}
          <a href={DECODER_URL} className={A}>
            Transformer Decoder Explainer
          </a>
          ,{" "}
          <a href={INFERENCE_URL} className={A}>
            LLM Inference Explained
          </a>
          ,{" "}
          <a href={KERNELS_URL} className={A}>
            GPU Kernels Explained
          </a>
          ,{" "}
          <a href={TRADEOFFS_URL} className={A}>
            Inference Trade-offs Explained
          </a>{" "}
          and others, all in the header&apos;s switch).
        </p>

        <h2>The engine</h2>
        <p>
          Every animation is a run of{" "}
          <a href={ENGINE_URL} className={A}>
            Agent_Loop_Sim
          </a>
          , vendored into this site at commit{" "}
          <code>{VENDORED.commit.slice(0, 7)}</code> (
          <a
            href={repoFile("src/lib/engine/vendor/VENDORED.json")}
            className={A}
          >
            VENDORED.json
          </a>{" "}
          records each file&apos;s SHA-256). Its Python reference and the
          TypeScript port the site runs produce the same events, token for token
          and float for float; the site&apos;s CI regenerates its fixtures from
          the Python reference installed at that commit and requires the port to
          match them. It has:
        </p>
        <ul>
          <li>
            a <strong>model interface</strong> with a scripted back end (a
            deterministic policy for every teaching run), a replay back end
            (recorded traces, checked prompt by prompt) and, offline only, a
            local back end (llama.cpp);
          </li>
          <li>
            a real <strong>tokenizer</strong>: Qwen2.5&apos;s byte-level BPE,
            vendored, which gave the same ids as llama.cpp&apos;s on every
            prompt the scenarios send;
          </li>
          <li>
            <strong>fake tools</strong> over an in-memory world: a file system,
            a shell simulator whose <code>pytest</code> really evaluates the
            tiny repository&apos;s tests, search over a fixed corpus, a
            calculator;
          </li>
          <li>
            <strong>accounting</strong>: a prompt-cache model, a dated price
            table and a time-to-first-token plus tokens-per-second latency
            model;
          </li>
          <li>
            the <strong>harness policies</strong>: loop style, parallel calls,
            turn limits, permissions with a simulated human, context strategies,
            prompt layouts, sub-agents, hooks, retries with back-off and loop
            detection;
          </li>
          <li>
            a versioned <strong>trace format</strong> (JSON Lines, with a JSON
            Schema) and a seeded random-number generator (mulberry32) shared by
            both languages.
          </li>
        </ul>

        <h2>What is real and what is illustrative</h2>
        <ul>
          <li>
            Real: token counts; the recorded traces (
            <Link href="/traces" className={A}>
              provenance
            </Link>
            ); the local model&apos;s measured speed (
            {v("latency.local-i7.prefill_tps", "num")} tokens/s prefill,{" "}
            {v("latency.local-i7.decode_tps", "num")} tokens/s decode); the
            price figures as published on the date given.
          </li>
          <li>
            Illustrative: the hosted-model latency, tool latencies and the
            simulated human&apos;s answer times; the prompt-cache model (a
            simple prefix model of the providers&apos; documented rules); the
            scripted policies and the scripted summariser; the tiny context
            windows of chapter 3; chapter 7&apos;s command-line sandbox; chapter
            8&apos;s tool failure rate; chapter 9&apos;s harness imitations,
            which are a policy imitation, not the product. Every chapter marks
            these.
          </li>
          <li>
            Costs combine Qwen2.5 token counts with other providers&apos; list
            prices: &quot;this many tokens at that price&quot;, not a quote.
          </li>
          <li>
            Descriptions of public harnesses come from their documentation, with
            an access date; anything not read from a document is marked as
            inferred.
          </li>
        </ul>

        <h2>How it is checked</h2>
        <ul>
          <li>
            Engine: Python tests and exact TS parity on every scenario, policy
            and replay (in Agent_Loop_Sim&apos;s CI).
          </li>
          <li>
            Site: the vendored files&apos; hashes; the chapters&apos; runs and
            animation frames against the Python reference (unit tests); key
            frames&apos; captions on the page (end-to-end); every number in the
            prose is computed by the engine at build time; every code block is
            cut from the vendored engine.
          </li>
          <li>
            Every animation plays, pauses, steps, scrubs and resets from the
            keyboard, with no console errors, in light and dark mode at 1,280
            and 390 px wide; nothing plays by itself with reduced motion; axe
            finds no accessibility violations; Lighthouse scores at least 0.9.
          </li>
        </ul>

        <h2>Go deeper</h2>
        <p>
          The slides behind the chapters: the{" "}
          <a href={AGENTS_HUB} className={A}>
            Agents
          </a>{" "}
          and{" "}
          <a href={CODING_AGENTS_HUB} className={A}>
            Coding Agents
          </a>{" "}
          series. Source and issues:{" "}
          <a href={GITHUB_URL} className={A}>
            GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
