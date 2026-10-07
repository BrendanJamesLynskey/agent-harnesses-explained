"use client";

/**
 * Chapter 4: prompt caching. One bar per model call: the prompt, split into the prefix read
 * from the provider's cache (solid) and the rest (hatched: processed and written to the cache,
 * or just processed when the prompt is below the provider's minimum). Beside it, the running
 * cost with the cache and without. Three prompt layouts: a stable prefix; the current time
 * in the system prompt; the tool list reordered every turn. Frames are `cacheFrames` of the
 * engine's runs; prices are list prices (dated, illustrative).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { cacheCaption } from "@/lib/agent/captions";
import { PRICES, cacheFrames } from "@/lib/engine/vendor/index";
import { fmtInt, fmtMs, fmtUsd, pct } from "@/lib/format";
import { OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const LAYOUTS = [
  { value: "stable", label: "stable prefix" },
  { value: "timestamp", label: "time in system prompt" },
  { value: "reorder_tools", label: "tools reordered" },
] as const;
const PRICE_KEYS = [
  { value: "claude-sonnet-4.6", label: "Sonnet 4.6" },
  { value: "claude-haiku-4.5", label: "Haiku 4.5" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
] as const;
type Layout = (typeof LAYOUTS)[number]["value"];
type PriceKey = (typeof PRICE_KEYS)[number]["value"];

const SUMMARY: Record<Layout, string> = {
  stable:
    "System prompt and tools never change, and messages are only appended: each prompt starts with the previous one.",
  timestamp:
    "The system prompt ends with the current time, so the prompt differs from the last one within its first few dozen tokens.",
  reorder_tools:
    "The tool list is rotated every turn, so prompts match only up to the end of the system text.",
};

const CW = 560;
const CH = 110;
const READ = OKABE_ITO.blue;
const FRESH = OKABE_ITO.sky;

export default function CacheWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("cache");
  const [layout, setLayout] = useState<Layout>("stable");
  const [priceKey, setPriceKey] = useState<PriceKey>("claude-sonnet-4.6");
  const font = useSvgFont(CW);
  const fs = font.fs;
  const key = `${layout}-${priceKey}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => (events.length ? cacheFrames(events) : []),
    [events],
  );
  const st = useStepper(frames.length, { stepMs: 1000, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const price = PRICES[priceKey]!;
  const f = frames[st.step]!;
  const maxIn = Math.max(...frames.map((x) => x.input as number));
  const end = events[events.length - 1]!;
  const last = frames[frames.length - 1]!;
  const maxCost = Math.max(last.cum as number, last.cum_plain as number) * 1.08;
  const px = (i: number) =>
    30 + (i * (CW - 40)) / Math.max(1, frames.length - 1);
  const py = (c: number) => CH - 16 - ((CH - 24) * c) / maxCost;
  const line = (k: "cum" | "cum_plain") =>
    frames
      .slice(0, st.step + 1)
      .map(
        (x, i) =>
          `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(x[k] as number).toFixed(1)}`,
      )
      .join(" ");
  const hl = (f.cached as number) > 0 ? "read hit" : "write";

  const visual = (
    <div className="mx-auto max-w-xl">
      <ol
        className="space-y-1"
        aria-label="Each model call's prompt: cached prefix and the rest"
      >
        {frames.map((x, i) => {
          const shown = i <= st.step;
          const stored = (x.input as number) >= price.min_tokens;
          return (
            <li key={i} className="flex items-center gap-2" data-call={i}>
              <span className="w-6 shrink-0 text-right font-mono text-[0.7rem] text-neutral-600 dark:text-neutral-400">
                {i + 1}
              </span>
              <div
                className="relative h-4 min-w-0 flex-1"
                style={{
                  opacity: shown ? (i === st.step ? 1 : 0.6) : 0.12,
                  outline:
                    i === st.step
                      ? `2px solid ${STATE_COLOUR.active}`
                      : undefined,
                  outlineOffset: 1,
                }}
              >
                <div
                  className="flex h-full"
                  style={{ width: `${(100 * (x.input as number)) / maxIn}%` }}
                >
                  <div
                    style={{
                      width: `${100 * (x.hit as number)}%`,
                      backgroundColor: READ,
                    }}
                    className="h-full"
                  />
                  <div
                    className="h-full flex-1"
                    style={{
                      backgroundColor: stored ? FRESH : "#a3a3a3",
                      backgroundImage: HATCH_CSS,
                    }}
                  />
                </div>
              </div>
              <span className="w-24 shrink-0 font-mono text-[0.68rem] text-neutral-700 dark:text-neutral-300">
                {shown
                  ? `${pct(x.hit as number)} · ${fmtInt(x.input as number)}`
                  : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: READ }}
          />{" "}
          read from the cache
        </li>
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: FRESH, backgroundImage: HATCH_CSS }}
          />{" "}
          processed and written to the cache
        </li>
        <li className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: "#a3a3a3", backgroundImage: HATCH_CSS }}
          />{" "}
          processed, too short to cache
        </li>
      </ul>
      <p className="mt-3 text-[0.72rem] text-neutral-600 dark:text-neutral-400">
        Running cost: solid with the cache, dashed without
      </p>
      <svg
        ref={font.ref}
        viewBox={`0 0 ${CW} ${CH}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Running cost: ${fmtUsd(f.cum as number)} with the cache against ${fmtUsd(f.cum_plain as number)} without, after call ${st.step + 1}.`}
      >
        <line
          x1={30}
          x2={CW - 6}
          y1={CH - 16}
          y2={CH - 16}
          className="stroke-neutral-400"
        />
        <text
          x={30}
          y={CH - 3}
          style={{ fontSize: fs(9) }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          call 1
        </text>
        <text
          x={CW - 6}
          y={CH - 3}
          textAnchor="end"
          style={{ fontSize: fs(9) }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          call {frames.length}
        </text>
        <path
          d={line("cum_plain")}
          fill="none"
          stroke="#737373"
          strokeWidth={2}
          strokeDasharray="5 3"
        />
        <path d={line("cum")} fill="none" stroke={READ} strokeWidth={2.5} />
        <text
          x={px(st.step) + 4}
          y={py(f.cum as number) - 4}
          style={{ fontSize: fs(9.5) }}
          fill={READ}
        >
          {fmtUsd(f.cum as number)}
        </text>
      </svg>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Read from cache"
        value={pct(
          (end.totals.cached_tokens as number) /
            (end.totals.input_tokens as number),
        )}
        hint="of all prompt tokens"
      />
      <Stat
        label="Cost, cached"
        value={fmtUsd(last.cum as number)}
        hint={`without: ${fmtUsd(last.cum_plain as number)}`}
      />
      <Stat
        label="Minimum"
        value={`${fmtInt(price.min_tokens)} tok`}
        hint={
          price.block > 1
            ? `in ${price.block}-token blocks`
            : "cacheable prompt"
        }
      />
      <Stat
        label="This call's TTFT"
        value={fmtMs(f.ttft as number)}
        hint="time to first token"
      />
    </div>
  );

  return (
    <AnimationPanel
      testId="cache-widget"
      title="The cached prefix, call by call"
      summary={SUMMARY[layout]}
      stepper={st}
      stepLabel="call"
      caption={cacheCaption(f, st.step)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <>
          <Segmented
            label="Prompt layout"
            value={layout}
            options={LAYOUTS}
            onChange={setLayout}
          />
          <Segmented
            label="Prices"
            value={priceKey}
            options={PRICE_KEYS}
            onChange={setPriceKey}
          />
        </>
      }
    />
  );
}
