"use client";

/**
 * Every run a chapter animates, computed by the vendored engine in a Web Worker (one shared
 * worker; the tokenizer is fetched and built once). Falls back to the main thread if
 * workers are unavailable. Results are cached per chapter for the page's lifetime.
 */
import { useEffect, useState } from "react";

import type { Chapter, Ev, RunConfig } from "@/lib/engine";

type Runs = Record<string, Ev[]>;
export type EngineState =
  | { status: "loading" }
  | { status: "ready"; runs: Runs }
  | { status: "error"; error: string };

let worker: Worker | null | undefined;
let nextId = 0;
const waiting = new Map<
  number,
  {
    resolve: (r: Runs | Ev[]) => void;
    reject: (e: Error) => void;
  }
>();
const cache = new Map<Chapter, Promise<Runs>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(
      new URL("../../lib/engine/engine.worker.ts", import.meta.url),
    );
    worker.onmessage = (
      e: MessageEvent<{
        id: number;
        runs?: Runs;
        events?: Ev[];
        error?: string;
      }>,
    ) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      waiting.delete(e.data.id);
      if (e.data.runs) w.resolve(e.data.runs);
      else if (e.data.events) w.resolve(e.data.events);
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
          waiting.set(id, {
            resolve: resolve as (r: Runs | Ev[]) => void,
            reject,
          });
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

async function mainThreadRun(cfg: RunConfig): Promise<Ev[]> {
  const { MERGES_URL, Tokenizer, runConfig } = await import("@/lib/engine");
  const text = await fetch(MERGES_URL).then((r) => r.text());
  return runConfig(cfg, new Tokenizer(text));
}

const live = new Map<string, Promise<Ev[]>>();

/** One run of any configuration (the cost calculator), cached by its JSON. */
export function runLive(cfg: RunConfig): Promise<Ev[]> {
  const key = JSON.stringify(cfg);
  let p = live.get(key);
  if (!p) {
    const w = getWorker();
    p = w
      ? new Promise<Ev[]>((resolve, reject) => {
          const id = nextId++;
          waiting.set(id, {
            resolve: resolve as (r: Runs | Ev[]) => void,
            reject,
          });
          w.postMessage({ id, config: cfg });
        })
      : mainThreadRun(cfg);
    live.set(key, p);
  }
  return p;
}

export type LiveState =
  | { status: "loading" }
  | { status: "ready"; events: Ev[]; key: string }
  | { status: "error"; error: string };

/** The events of one configuration, re-run whenever it changes. While a new run is on its
 * way the previous one stays (its `key` says which configuration it belongs to). */
export function useLiveRun(cfg: RunConfig): LiveState {
  const key = JSON.stringify(cfg);
  const [state, setState] = useState<LiveState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    runLive(JSON.parse(key) as RunConfig).then(
      (events) => alive && setState({ status: "ready", events, key }),
      (e: Error) => alive && setState({ status: "error", error: e.message }),
    );
    return () => {
      alive = false;
    };
  }, [key]);
  return state;
}
