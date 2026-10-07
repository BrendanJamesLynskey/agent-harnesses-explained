/**
 * Runs the engine off the main thread: fetches the tokenizer once, builds it, and answers
 * { id, chapter } with every run of that chapter, or { id, config } with one run (the cost
 * calculator's live runs). Building the tokenizer (151k merges) and the runs take a few
 * hundred milliseconds, which would otherwise block the page.
 */
import {
  MERGES_URL,
  runChapter,
  runConfig,
  Tokenizer,
  type Chapter,
  type RunConfig,
} from "./index";

let tok: Promise<Tokenizer> | null = null;

type Req = { id: number; chapter?: Chapter; config?: RunConfig };

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (m: unknown) => void;
};

ctx.onmessage = async (e) => {
  const { id, chapter, config } = e.data;
  try {
    tok ??= fetch(MERGES_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`tokenizer: HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => new Tokenizer(t));
    const t = await tok;
    if (config) ctx.postMessage({ id, events: runConfig(config, t) });
    else ctx.postMessage({ id, runs: runChapter(chapter!, t) });
  } catch (err) {
    ctx.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
