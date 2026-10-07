/**
 * /traces: the three recorded traces, with their provenance, llama.cpp's own counts and
 * timings, and the model's every completion. The chapters replay them; this page lets a
 * reader check what was recorded. Server Component, static.
 */
import Link from "next/link";

import { TRACES, type Obj } from "@/lib/engine";
import { fmtInt, fmtMs } from "@/lib/format";
import { ENGINE_URL } from "@/lib/site";

export const metadata = {
  title: "Recorded traces",
  description:
    "Three runs of Qwen2.5-1.5B-Instruct on a CPU, recorded once with llama.cpp and replayed token-exactly by the chapters: provenance, counts, timings and every completion.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";

const ABOUT: Record<string, { title: string; failed: string }> = {
  "qwen-fix-test-native": {
    title: "Fix a failing test (native tool calls)",
    failed:
      "Listed the files, then claimed calc.py was missing (it is in the listing it had just received) and stopped without running the tests.",
  },
  "qwen-fix-test-react": {
    title: "Fix a failing test (ReAct text)",
    failed:
      "Ran the tests correctly, misread the failure as add() missing from the test file, wrapped its Action Input in a Markdown code fence twice (both rejected as malformed), then declared success without changing anything.",
  },
  "qwen-lookup-native": {
    title: "Search and calculate",
    failed:
      "Made two well-chosen searches in one turn (parallel calls), then did not use the calculator: it did the arithmetic in prose with wrong unit conversions and ran into the 384-token output limit mid-sentence.",
  },
};

function Row({ k, v }: { k: string; v: string }): JSX.Element {
  return (
    <tr>
      <th className="py-0.5 pr-3 text-left align-top font-medium text-neutral-600 dark:text-neutral-400">
        {k}
      </th>
      <td className="break-all py-0.5 font-mono text-[0.78rem]">{v}</td>
    </tr>
  );
}

export default function TracesPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /traces
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Recorded traces
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Three runs of a small open-weights model, recorded once on a desktop
          CPU with llama.cpp and replayed by the chapters. Replaying rebuilds
          every prompt from the scenario and checks it against the recording (a
          fingerprint of its bytes, and its token count), so the replay is the
          recorded run, token for token; nothing on this site calls a model. The
          files, and the script that recorded them, are in{" "}
          <a href={ENGINE_URL} className={A}>
            Agent_Loop_Sim
          </a>{" "}
          (<code>traces/</code>, <code>scripts/record_trace.py</code>).
        </p>
        <p>
          The small model fails all three tasks, in ways a harness has to
          expect: a false reading of a tool result, malformed calls, skipping a
          tool and ending on a wrong answer. Watch them replay in{" "}
          <Link href="/learn/01-the-agent-loop" className={A}>
            chapter 1
          </Link>
          .
        </p>
      </div>
      {Object.entries(TRACES).map(([id, t]) => {
        const p = t.provenance as Obj;
        const calls = t.calls as Obj[];
        const checks = t.tokenizer_check as Obj[];
        return (
          <section
            key={id}
            id={id}
            className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800"
          >
            <h2 className="text-xl font-semibold">{ABOUT[id]?.title ?? id}</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {id}
            </p>
            <p className="mt-3 text-neutral-700 dark:text-neutral-300">
              <strong>What happened:</strong> {ABOUT[id]?.failed}
            </p>
            <table className="mt-4 w-full text-sm">
              <tbody>
                <Row
                  k="Model"
                  v={`${p.model}, ${p.quantisation} GGUF (${p.gguf})`}
                />
                <Row
                  k="Weights"
                  v={`${p.model_repo} @ ${(p.model_revision as string).slice(0, 7)}, SHA-256 ${p.gguf_sha256}`}
                />
                <Row
                  k="Runtime"
                  v={`${p.runtime}, llama.cpp ${(p.llama_cpp_commit as string).slice(0, 7)}`}
                />
                <Row
                  k="Sampling"
                  v={`temperature ${p.sampling.temperature}, top-k ${p.sampling.top_k}, seed ${p.sampling.seed}, at most ${p.sampling.n_predict} tokens per call`}
                />
                <Row k="Machine" v={`${p.cpu}`} />
                <Row k="Recorded" v={`${p.recorded_at} (engine ${p.engine})`} />
                <Row k="Loop style" v={`${t.policy.style}`} />
                <Row
                  k="Tokenizer check"
                  v={`${checks.filter((c) => c.prompt_ids_equal).length} of ${checks.length} prompts: the vendored tokenizer's ids equal llama.cpp's`}
                />
              </tbody>
            </table>
            <div
              className="mt-4 overflow-x-auto"
              tabIndex={0}
              aria-label={`${id}: llama.cpp counts and timings per call`}
            >
              <table className="w-full min-w-[30rem] text-left text-[0.78rem]">
                <thead className="text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Call</th>
                    <th className="py-1 pr-2 font-medium">Prompt tokens</th>
                    <th className="py-1 pr-2 font-medium">
                      Reused by llama.cpp
                    </th>
                    <th className="py-1 pr-2 font-medium">Prefill</th>
                    <th className="py-1 pr-2 font-medium">Output</th>
                    <th className="py-1 pr-2 font-medium">Decode</th>
                    <th className="py-1 font-medium">Stopped by</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {calls.map((c, i) => (
                    <tr key={i}>
                      <td className="py-0.5 pr-2">{i + 1}</td>
                      <td className="py-0.5 pr-2">{fmtInt(c.prompt_tokens)}</td>
                      <td className="py-0.5 pr-2">{fmtInt(c.llama.cache_n)}</td>
                      <td className="py-0.5 pr-2">
                        {fmtMs(c.llama.prompt_ms)}
                      </td>
                      <td className="py-0.5 pr-2">
                        {fmtInt(c.llama.predicted_n)}
                      </td>
                      <td className="py-0.5 pr-2">
                        {fmtMs(c.llama.predicted_ms)}
                      </td>
                      <td className="py-0.5">
                        {c.llama.stop_type === "eos"
                          ? "end of turn"
                          : c.llama.stop_type === "word"
                            ? `"${c.llama.stopping_word}"`
                            : "token limit"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              The model&apos;s completions
            </h3>
            {calls.map((c, i) => (
              <figure key={i} className="mt-3">
                <figcaption className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  call {i + 1}
                </figcaption>
                <pre
                  tabIndex={0}
                  className="focus-ring mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-3 font-mono text-[0.75rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800"
                >
                  {c.text as string}
                </pre>
              </figure>
            ))}
          </section>
        );
      })}
    </main>
  );
}
