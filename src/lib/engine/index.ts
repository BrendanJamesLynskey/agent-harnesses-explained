/**
 * The vendored Agent_Loop_Sim engine (src/lib/engine/vendor, pinned in VENDORED.json) and the
 * runs the chapters animate (src/data/chapter_configs.json). A run is a scenario under a
 * policy, or a recorded trace replayed token-exactly; nothing here calls a language model.
 */
import CONFIGS from "@/data/chapter_configs.json";
import TRACE_FIX_NATIVE from "@/data/traces/qwen-fix-test-native.json";
import TRACE_FIX_REACT from "@/data/traces/qwen-fix-test-react.json";
import TRACE_LOOKUP from "@/data/traces/qwen-lookup-native.json";

import {
  replayTrace,
  run,
  scenario,
  type Ev,
  type Obj,
  type Tokenizer,
} from "./vendor/index";

export * from "./vendor/index";

export type Chapter = keyof typeof CONFIGS;
export type RunConfig = {
  scenario?: string;
  policy?: Obj;
  seed?: number;
  trace?: string;
};

export const CHAPTER_CONFIGS = CONFIGS as unknown as Record<
  Chapter,
  Record<string, RunConfig>
>;

export const TRACES: Record<string, Obj> = {
  "qwen-fix-test-native": TRACE_FIX_NATIVE as Obj,
  "qwen-fix-test-react": TRACE_FIX_REACT as Obj,
  "qwen-lookup-native": TRACE_LOOKUP as Obj,
};

/** Where the client fetches the tokenizer's merges (vendored, about 1.7 MB, 0.7 MB gzipped). */
export const MERGES_URL = "/tokenizer/qwen2.5-merges.txt";

export function runConfig(cfg: RunConfig, tok: Tokenizer): Ev[] {
  if (cfg.trace) {
    const t = TRACES[cfg.trace];
    if (!t) throw new Error(`no recorded trace '${cfg.trace}'`);
    return replayTrace(t, tok);
  }
  return run(
    scenario(cfg.scenario!),
    cfg.policy ?? null,
    tok,
    null,
    cfg.seed ?? null,
  );
}

/** Every run of one chapter, by variant key. */
export function runChapter(
  chapter: Chapter,
  tok: Tokenizer,
): Record<string, Ev[]> {
  const out: Record<string, Ev[]> = {};
  for (const [k, cfg] of Object.entries(CHAPTER_CONFIGS[chapter]))
    out[k] = runConfig(cfg, tok);
  return out;
}
