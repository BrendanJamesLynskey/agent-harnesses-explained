/**
 * Runs the engine off the main thread: fetches the tokenizer once, builds it, and answers
 * { id, chapter } with every run of that chapter. Building the tokenizer (151k merges) and
 * the runs take a few hundred milliseconds, which would otherwise block the page.
 */
import { MERGES_URL, runChapter, Tokenizer, type Chapter } from "./index";

let tok: Promise<Tokenizer> | null = null;

const ctx = self as unknown as {
  onmessage:
    | ((e: MessageEvent<{ id: number; chapter: Chapter }>) => void)
    | null;
  postMessage: (m: unknown) => void;
};

ctx.onmessage = async (e) => {
  const { id, chapter } = e.data;
  try {
    tok ??= fetch(MERGES_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`tokenizer: HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => new Tokenizer(t));
    const runs = runChapter(chapter, await tok);
    ctx.postMessage({ id, runs });
  } catch (err) {
    ctx.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
