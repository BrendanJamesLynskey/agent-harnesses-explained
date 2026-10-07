/**
 * Chapter 10's arithmetic: a run's cost and time taken apart, call by call, from the
 * engine's events. Cost per model call = fresh prompt tokens at the input (or cache-write)
 * price + cached tokens at the cache-read price + output tokens at the output price; time
 * = each call's time to first token and decode time, the tools' time, the human's waits
 * and the retry back-offs. Pure functions of the events (tests/unit/cost.test.ts checks
 * the parts add up to the engine's own totals).
 */
import { PRICES, type Ev, type Obj } from "@/lib/engine/vendor/index";

export type CallCost = {
  agent: string;
  turn: number;
  fresh: number;
  cached: number;
  output: number;
  /** US dollars: fresh tokens (input or cache-write price), cached reads, output. */
  usdFresh: number;
  usdCached: number;
  usdOutput: number;
  ttft: number;
  decode: number;
};

export function callCosts(events: Ev[]): CallCost[] {
  const price = PRICES[(events[0]!.policy as Obj).cache.price as string]!;
  return events
    .filter((e) => e.type === "model_call")
    .map((e) => {
      const usdCached = (e.cached_tokens * price.cache_read) / 1e6;
      const usdOutput = (e.output_tokens * price.output) / 1e6;
      return {
        agent: e.agent,
        turn: e.turn,
        fresh: e.input_tokens - e.cached_tokens,
        cached: e.cached_tokens,
        output: e.output_tokens,
        usdFresh: e.cost - usdCached - usdOutput,
        usdCached,
        usdOutput,
        ttft: e.ttft,
        decode: e.dur - e.ttft,
      };
    });
}

export type TimeSplit = {
  ttft: number;
  decode: number;
  tool: number;
  human: number;
  backoff: number;
};

/** Where the run's time went (tool time excludes a sub-agent's `task` call, whose time is
 * the sub-agent's own model and tool time, counted already). Sums durations: with
 * parallel tool calls the parts can add up to more than the wall-clock time. */
export function timeSplit(events: Ev[]): TimeSplit {
  const out: TimeSplit = { ttft: 0, decode: 0, tool: 0, human: 0, backoff: 0 };
  for (const e of events) {
    if (e.type === "model_call") {
      out.ttft += e.ttft;
      out.decode += e.dur - e.ttft;
    } else if (e.type === "tool_result" && e.name !== "task") {
      // a result's duration includes its retries' back-offs, counted separately
      out.tool += e.dur;
    } else if (e.type === "permission_check") out.human += e.wait;
    else if (e.type === "retry") {
      out.backoff += e.backoff;
      out.tool -= e.backoff;
    }
  }
  return out;
}
