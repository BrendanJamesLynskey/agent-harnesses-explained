"use client";

/**
 * Chapter 3: the context window as a budget. One column per model call, stacked by what the
 * context holds; the window and the compaction trigger as lines. When the next prompt would
 * cross the trigger, the harness's strategy fires: drop the oldest messages (truncate), cut
 * old tool results to their first lines (clip), or have the model summarise the older
 * history (summarise). The facts the task needs are tracked: a fact is lost when no message
 * left in the context contains it. Frames are `budgetFrames` of the engine's runs.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS, KindLegend } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { budgetCaption } from "@/lib/agent/captions";
import { SCENARIOS, budgetFrames, type Obj } from "@/lib/engine/vendor/index";
import { fmtInt, fmtUsd } from "@/lib/format";
import { HATCHED_KINDS, KIND_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { Hatch } from "./Hatch";
import { useEngine } from "./useEngine";

const STRATEGIES = [
  { value: "none", label: "none" },
  { value: "truncate", label: "truncate" },
  { value: "clip", label: "clip" },
  { value: "summarise", label: "summarise" },
] as const;
const WINDOWS = [
  { value: "3000", label: "3,000" },
  { value: "4000", label: "4,000" },
] as const;
type Strategy = (typeof STRATEGIES)[number]["value"];
type Win = (typeof WINDOWS)[number]["value"];

const FACTS = SCENARIOS.research!.facts as {
  id: string;
  text: string;
  important: boolean;
}[];

const W = 360;
const H = 190;
const PAD_L = 34;
const PAD_B = 18;

export default function BudgetWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("budget");
  const [strategy, setStrategy] = useState<Strategy>("summarise");
  const [win, setWin] = useState<Win>("3000");
  const font = useSvgFont(W);
  const fs = font.fs;
  const key = `w${win}-${strategy}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => (events.length ? budgetFrames(events) : []),
    [events],
  );
  const st = useStepper(frames.length, { stepMs: 1100, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const wnd = f.window as number;
  const top = wnd * 1.06;
  const y = (tok: number) => PAD_B + ((H - 2 * PAD_B) * (top - tok)) / top;
  const n = frames.length;
  const colW = Math.min(30, (W - PAD_L - 6) / n - 4);
  const x = (i: number) => PAD_L + 4 + i * ((W - PAD_L - 6) / n);
  const lost = new Set(
    frames.slice(0, st.step + 1).flatMap((x) => x.lost as string[]),
  );
  const end = events[events.length - 1]!;
  const kinds = [
    ...new Set(
      frames.flatMap((x) => (x.parts as Obj[]).map((p) => p.kind as string)),
    ),
  ];
  const hl =
    f.phase === "compact"
      ? "trigger"
      : f.phase === "overflow"
        ? "window"
        : "window reserve";

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Context tokens per model call against a ${fmtInt(wnd)}-token window, strategy ${strategy}. ${budgetCaption(f)}`}
      >
        <defs>
          <Hatch id="budget-hatch" />
          <Hatch id="budget-reserve" colour="#737373" />
        </defs>
        {/* the reserve kept free for the answer, at the top of the window */}
        <rect
          x={PAD_L}
          y={y(wnd)}
          width={W - PAD_L}
          height={y(wnd - (f.reserve as number)) - y(wnd)}
          fill="url(#budget-reserve)"
          opacity={0.6}
        />
        <line
          x1={PAD_L}
          x2={W}
          y1={y(wnd)}
          y2={y(wnd)}
          className="stroke-neutral-800 dark:stroke-neutral-200"
          strokeWidth={1.5}
        />
        <text
          x={W - 2}
          y={y(wnd) - 3}
          textAnchor="end"
          style={{ fontSize: fs(9) }}
          className="fill-neutral-700 dark:fill-neutral-300"
        >
          window {fmtInt(wnd)}
        </text>
        <line
          x1={PAD_L}
          x2={W}
          y1={y(f.trigger as number)}
          y2={y(f.trigger as number)}
          stroke={STATE_COLOUR.stalled}
          strokeDasharray="5 3"
          strokeWidth={1.5}
        />
        <text
          x={W - 2}
          y={y(f.trigger as number) + 11}
          textAnchor="end"
          style={{ fontSize: fs(9) }}
          fill={STATE_COLOUR.stalled}
        >
          compact above {fmtInt(f.trigger as number)}
        </text>
        {[0, 1000, 2000, 3000, 4000]
          .filter((t) => t <= wnd)
          .map((t) => (
            <g key={t}>
              <line
                x1={PAD_L - 3}
                x2={PAD_L}
                y1={y(t)}
                y2={y(t)}
                className="stroke-neutral-500"
              />
              <text
                x={PAD_L - 5}
                y={y(t) + 3}
                textAnchor="end"
                style={{ fontSize: fs(8.5) }}
                className="fill-neutral-600 font-mono dark:fill-neutral-400"
              >
                {t === 0 ? "0" : `${t / 1000}k`}
              </text>
            </g>
          ))}
        {frames.slice(0, st.step + 1).map((fr, i) => {
          let acc = 0;
          const cur = i === st.step;
          return (
            <g key={i} data-col={i} opacity={cur ? 1 : 0.55}>
              {fr.phase === "overflow" ? (
                <text
                  x={x(i) + colW / 2}
                  y={y(wnd) + 14}
                  textAnchor="middle"
                  style={{ fontSize: fs(11) }}
                  fill={STATE_COLOUR.stalled}
                >
                  ✕
                </text>
              ) : (
                (fr.parts as Obj[]).map((p) => {
                  const y0 = y(acc + (p.tokens as number));
                  const h = y(acc) - y0;
                  acc += p.tokens as number;
                  return (
                    <g key={p.kind as string}>
                      <rect
                        x={x(i)}
                        y={y0}
                        width={colW}
                        height={h}
                        fill={KIND_COLOUR[p.kind as string]}
                      />
                      {HATCHED_KINDS.has(p.kind as string) && (
                        <rect
                          x={x(i)}
                          y={y0}
                          width={colW}
                          height={h}
                          fill="url(#budget-hatch)"
                          opacity={0.6}
                        />
                      )}
                    </g>
                  );
                })
              )}
              {fr.phase === "compact" && (
                <text
                  x={x(i) + colW / 2}
                  y={H - 4}
                  textAnchor="middle"
                  style={{ fontSize: fs(9) }}
                  fill={STATE_COLOUR.stalled}
                >
                  ⇣
                </text>
              )}
              {cur && fr.phase !== "overflow" && (
                <rect
                  x={x(i) - 1.5}
                  y={y(fr.total as number) - 1.5}
                  width={colW + 3}
                  height={y(0) - y(fr.total as number) + 3}
                  fill="none"
                  stroke={STATE_COLOUR.active}
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </svg>
      <KindLegend kinds={kinds} />
      <div className="mt-3">
        <p className="text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          Facts in the notes (★ = needed for the answer): struck out once
          nothing in the context holds them
        </p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {FACTS.map((fact) => {
            const gone = lost.has(fact.id);
            return (
              <li
                key={fact.id}
                data-fact={fact.id}
                data-lost={gone ? "true" : "false"}
                title={fact.text}
                className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] ring-1 ${gone ? "text-neutral-900 line-through ring-[#D55E00] dark:text-neutral-100" : "bg-white text-neutral-800 ring-neutral-300 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-700"}`}
                style={
                  gone
                    ? {
                        backgroundColor: "rgb(213 94 0 / 0.15)",
                        backgroundImage: HATCH_CSS,
                      }
                    : undefined
                }
              >
                {fact.important ? "★ " : ""}
                {fact.id}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Outcome"
        value={end.status === "done" ? "answered" : "overflowed"}
      />
      <Stat label="Compactions" value={String(end.totals.compactions)} />
      <Stat
        label="Facts lost"
        value={`${lost.size} of ${FACTS.length}`}
        hint={`★ lost: ${FACTS.filter((x) => x.important && lost.has(x.id)).length}`}
      />
      <Stat
        label="Cost"
        value={fmtUsd(end.totals.cost as number)}
        hint="whole run, Sonnet 4.6 prices"
      />
    </div>
  );

  return (
    <AnimationPanel
      testId="budget-widget"
      title="Filling the window"
      summary="The research task reads four long notes; the window is set small so it fills. Each column is the prompt of one model call."
      stepper={st}
      stepLabel="call"
      caption={budgetCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <>
          <Segmented
            label="When it fills"
            value={strategy}
            options={STRATEGIES}
            onChange={setStrategy}
          />
          <Segmented
            label="Window (tokens)"
            value={win}
            options={WINDOWS}
            onChange={setWin}
          />
        </>
      }
    />
  );
}
