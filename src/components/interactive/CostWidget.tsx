"use client";

/**
 * Chapter 10: the cost and latency of a task, as a live calculator. Every change of a
 * parameter re-runs the engine (in the Web Worker) on that task and policy; the animation
 * then steps through the run's model calls, each one's cost split into fresh prompt tokens,
 * cached prompt tokens and output tokens, and its time into time-to-first-token and decode,
 * with the running totals and where the whole run's time went. Frames are the engine's
 * `cacheFrames`; the splits are src/lib/agent/cost.ts.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { costCaption } from "@/lib/agent/captions";
import { callCosts, timeSplit } from "@/lib/agent/cost";
import type { RunConfig } from "@/lib/engine";
import { PRICES, cacheFrames } from "@/lib/engine/vendor/index";
import { fmtInt, fmtMs, fmtUsd, pct } from "@/lib/format";
import { LANE_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useLiveRun } from "./useEngine";

const TASKS = [
  { value: "fix_test", label: "fix a test" },
  { value: "research", label: "read the notes" },
  { value: "research_subagent", label: "notes, sub-agent" },
] as const;
const MODELS = [
  { value: "claude-sonnet-4.6", label: "Sonnet 4.6" },
  { value: "claude-haiku-4.5", label: "Haiku 4.5" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
  { value: "local", label: "local" },
] as const;
const SPEEDS = [
  { value: "hosted", label: "hosted API" },
  { value: "local-i7", label: "local CPU" },
] as const;
const CACHE = [
  { value: "on", label: "cache on" },
  { value: "off", label: "cache off" },
] as const;
const PERMS = [
  { value: "auto", label: "auto" },
  { value: "default", label: "default (asks)" },
] as const;
type Task = (typeof TASKS)[number]["value"];
type Model = (typeof MODELS)[number]["value"];
type Speed = (typeof SPEEDS)[number]["value"];
type Cache = (typeof CACHE)[number]["value"];
type Perm = (typeof PERMS)[number]["value"];

const COST_PARTS = [
  { key: "fresh", label: "fresh prompt", colour: OKABE_ITO.sky },
  { key: "hit", label: "cached prompt", colour: OKABE_ITO.blue },
  { key: "out", label: "output", colour: OKABE_ITO.orange },
] as const;
const TIME_PARTS = [
  { key: "ttft", label: "to first token", colour: "#737373" },
  { key: "out", label: "decode", colour: OKABE_ITO.orange },
  { key: "tool", label: "tools", colour: LANE_COLOUR.tool! },
  { key: "wait", label: "human", colour: LANE_COLOUR.human! },
  { key: "backoff", label: "back-off", colour: LANE_COLOUR.retry! },
] as const;

function Stack({
  parts,
  label,
  hover,
}: {
  parts: {
    key: string;
    label: string;
    colour: string;
    v: number;
    fmt: string;
  }[];
  label: string;
  hover: string | null;
}): JSX.Element {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div className="min-w-0">
      <div
        role="img"
        aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.fmt}`).join(", ")}`}
        className="flex h-5 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800"
      >
        {parts.map((p) => (
          <span
            key={p.key}
            data-part={p.key}
            style={{
              width: `${(100 * p.v) / total}%`,
              backgroundColor: p.colour,
              opacity: hover && hover !== p.key ? 0.3 : 1,
            }}
          />
        ))}
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] text-neutral-700 dark:text-neutral-300">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-2.5 w-3 rounded-sm"
              style={{ backgroundColor: p.colour }}
            />
            {p.label} <span className="font-mono">{p.fmt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CostWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const [task, setTask] = useState<Task>("fix_test");
  const [model, setModel] = useState<Model>("claude-sonnet-4.6");
  const [speed, setSpeed] = useState<Speed>("hosted");
  const [cache, setCache] = useState<Cache>("on");
  const [perm, setPerm] = useState<Perm>("auto");
  const [hover, setHover] = useState<string | null>(null);
  const cfg: RunConfig = useMemo(
    () => ({
      scenario: task,
      policy: {
        cache: { price: model, enabled: cache === "on" },
        latency: speed,
        permissions: { mode: perm },
      },
    }),
    [task, model, speed, cache, perm],
  );
  const run = useLiveRun(cfg);
  const events = useMemo(
    () => (run.status === "ready" ? run.events : []),
    [run],
  );
  const frames = useMemo(
    () => (events.length ? cacheFrames(events) : []),
    [events],
  );
  const calls = useMemo(
    () => (events.length ? callCosts(events) : []),
    [events],
  );
  const split = useMemo(
    () => (events.length ? timeSplit(events) : null),
    [events],
  );
  // restart when the new run's events arrive, not when the parameters change
  const shown = run.status === "ready" ? run.key : "";
  const pending = shown !== JSON.stringify(cfg);
  const st = useStepper(frames.length, { stepMs: 900, resetKey: shown });
  if (run.status !== "ready" || frames.length === 0 || !split)
    return (
      <EngineStatus error={run.status === "error" ? run.error : undefined} />
    );

  const i = Math.min(st.step, frames.length - 1);
  const f = frames[i]!;
  const c = calls[i]!;
  const end = events[events.length - 1]!;
  const upto = calls.slice(0, i + 1);
  const sum = (k: keyof (typeof calls)[number]) =>
    upto.reduce((s, x) => s + (x[k] as number), 0);
  const maxCost = Math.max(
    ...calls.map((x) => x.usdFresh + x.usdCached + x.usdOutput),
    1e-12,
  );
  const maxDur = Math.max(...calls.map((x) => x.ttft + x.decode), 1);
  const biggest = (
    [
      ["fresh", c.usdFresh],
      ["hit", c.usdCached],
      ["out", c.usdOutput],
    ] as const
  ).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const price = PRICES[model]!;

  const visual = (
    <div className="grid min-w-0 gap-3">
      <div
        role="img"
        aria-label={`Each model call's cost (left) and time (right); now at call ${i + 1} of ${calls.length}.`}
        className="grid min-w-0 grid-cols-2 gap-3"
      >
        {(["cost", "time"] as const).map((side) => (
          <div key={side} className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              {side === "cost" ? "Cost per call" : "Time per call"}
            </p>
            <div className="mt-1 flex h-28 items-end gap-0.5">
              {calls.map((x, k) => {
                const segs =
                  side === "cost"
                    ? [
                        { key: "fresh", v: x.usdFresh, c: OKABE_ITO.sky },
                        { key: "hit", v: x.usdCached, c: OKABE_ITO.blue },
                        { key: "out", v: x.usdOutput, c: OKABE_ITO.orange },
                      ]
                    : [
                        { key: "ttft", v: x.ttft, c: "#737373" },
                        { key: "out", v: x.decode, c: OKABE_ITO.orange },
                      ];
                const scale = side === "cost" ? maxCost : maxDur;
                return (
                  <div
                    key={k}
                    data-call={k}
                    className="flex min-w-0 flex-1 flex-col-reverse"
                    style={{
                      height: "100%",
                      opacity: k <= i ? 1 : 0.25,
                      outline:
                        k === i
                          ? `2px solid ${STATE_COLOUR.active}`
                          : undefined,
                      backgroundImage:
                        x.agent !== "main" ? HATCH_CSS : undefined,
                    }}
                    title={x.agent !== "main" ? "sub-agent call" : undefined}
                  >
                    {segs.map((s) => (
                      <span
                        key={s.key}
                        style={{
                          height: `${(100 * s.v) / scale}%`,
                          backgroundColor: s.c,
                          opacity: hover && hover !== s.key ? 0.3 : 1,
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Stack
        label="Cost so far"
        hover={hover}
        parts={COST_PARTS.map((p) => {
          const v =
            p.key === "fresh"
              ? sum("usdFresh")
              : p.key === "hit"
                ? sum("usdCached")
                : sum("usdOutput");
          return { ...p, v, fmt: fmtUsd(v) };
        })}
      />
      <Stack
        label="Where the whole run's time went"
        hover={hover}
        parts={TIME_PARTS.map((p) => {
          const v =
            p.key === "ttft"
              ? split.ttft
              : p.key === "out"
                ? split.decode
                : p.key === "tool"
                  ? split.tool
                  : p.key === "wait"
                    ? split.human
                    : split.backoff;
          return { ...p, v, fmt: fmtMs(v) };
        })}
      />
      <p className="text-[0.7rem] text-neutral-600 dark:text-neutral-400">
        Prices per million tokens: input ${price.input}, cached $
        {price.cache_read}, cache write ${price.cache_write}, output $
        {price.output} ({price.label}; list prices accessed {price.accessed},
        illustrative). Hatched bars are a sub-agent&apos;s calls.
      </p>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Total cost" value={fmtUsd(end.totals.cost as number)} />
      <Stat label="Total time" value={fmtMs(end.elapsed as number)} />
      <Stat
        label="Prompt tokens"
        value={fmtInt(end.totals.input_tokens as number)}
        hint={`${pct((end.totals.cached_tokens as number) / (end.totals.input_tokens as number))} cached`}
      />
      <Stat
        label="Model calls"
        value={String(end.totals.model_calls)}
        hint={`${fmtInt(end.totals.output_tokens as number)} output tokens`}
      />
    </div>
  );

  return (
    <AnimationPanel
      testId="cost-widget"
      title="What a task costs, call by call"
      summary={
        pending
          ? "Running the engine on the new settings…"
          : "Pick a task and a policy; the engine runs it and every number below follows from its calls."
      }
      stepper={st}
      stepLabel="call"
      caption={costCaption(f, i, c.ttft + c.decode)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? biggest}
      onEquationHover={setHover}
      params={
        <>
          <Segmented
            label="Task"
            value={task}
            options={TASKS}
            onChange={setTask}
          />
          <Segmented
            label="Model price"
            value={model}
            options={MODELS}
            onChange={setModel}
          />
          <Segmented
            label="Speed"
            value={speed}
            options={SPEEDS}
            onChange={setSpeed}
          />
          <Segmented
            label="Prompt cache"
            value={cache}
            options={CACHE}
            onChange={setCache}
          />
          <Segmented
            label="Permissions"
            value={perm}
            options={PERMS}
            onChange={setPerm}
          />
        </>
      }
    />
  );
}
