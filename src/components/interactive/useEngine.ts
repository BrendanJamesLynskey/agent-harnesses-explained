"use client";

/**
 * Every run a chapter animates, computed by the vendored engine in a Web Worker (one shared
 * worker; the tokenizer is fetched and built once). Falls back to the main thread if
 * workers are unavailable. Results are cached per chapter for the page's lifetime.
 */
import { useEffect, useState } from "react";

import type { Chapter, Ev } from "@/lib/engine";

type Runs = Record<string, Ev[]>;
export type EngineState =
  | { status: "loading" }
  | { status: "ready"; runs: Runs }
  | { status: "error"; error: string };

let worker: Worker | null | undefined;
let nextId = 0;
const waiting = new Map<
  number,
  { resolve: (r: Runs) => void; reject: (e: Error) => void }
>();
const cache = new Map<Chapter, Promise<Runs>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(
      new URL("../../lib/engine/engine.worker.ts", import.meta.url),
    );
    worker.onmessage = (
      e: MessageEvent<{ id: number; runs?: Runs; error?: string }>,
    ) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      waiting.delete(e.data.id);
      if (e.data.runs) w.resolve(e.data.runs);
      else w.reject(new Error(e.data.error ?? "engine failed"));
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function mainThread(chapter: Chapter): Promise<Runs> {
  const { MERGES_URL, Tokenizer, runChapter } = await import("@/lib/engine");
  const text = await fetch(MERGES_URL).then((r) => r.text());
  return runChapter(chapter, new Tokenizer(text));
}

export function loadChapter(chapter: Chapter): Promise<Runs> {
  let p = cache.get(chapter);
  if (!p) {
    const w = getWorker();
    p = w
      ? new Promise<Runs>((resolve, reject) => {
          const id = nextId++;
          waiting.set(id, { resolve, reject });
          w.postMessage({ id, chapter });
        })
      : mainThread(chapter);
    cache.set(chapter, p);
  }
  return p;
}

export function useEngine(chapter: Chapter): EngineState {
  const [state, setState] = useState<EngineState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadChapter(chapter).then(
      (runs) => live && setState({ status: "ready", runs }),
      (e: Error) => live && setState({ status: "error", error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [chapter]);
  return state;
}
