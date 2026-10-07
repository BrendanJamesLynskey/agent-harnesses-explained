"use client";

/**
 * Chapter 8: failure and recovery. The shell fails at random (30% of attempts, seeded); the
 * harness retries with exponential back-off up to a budget, feeds a final failure back to
 * the model, and stops (or nudges) the model when it repeats the same call. One seeded run
 * per retry budget and loop action; frames are the run's own events (model calls, tool
 * calls, retries, results, loop detection), the timeline is the engine's `timeline`.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Timeline, type Lane } from "@/components/agent/Timeline";
import { Segmented, Stat } from "@/components/ui/Controls";
import { RECOVERY_TYPES, recoveryCaption } from "@/lib/agent/captions";
import { timeline, verified, type Obj } from "@/lib/engine/vendor/index";
import { clip, fmtMs } from "@/lib/format";
import { LANE_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const BUDGETS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;
const LOOPS = [
  { value: "stop", label: "stop the run" },
  { value: "nudge", label: "nudge the model" },
] as const;
type Budget = (typeof BUDGETS)[number]["value"];
type Loop = (typeof LOOPS)[number]["value"];

const LANES: Lane[] = [
  {
    key: "model",
    label: "model",
    colour: LANE_COLOUR.model!,
    match: (s) => s.lane === "model",
  },
  {
    key: "tool",
    label: "tools",
    colour: LANE_COLOUR.tool!,
    match: (s) => s.lane === "tool",
  },
  {
    key: "backoff",
    label: "back-off",
    colour: LANE_COLOUR.retry!,
    match: (s) => s.lane === "retry",
    hatched: true,
  },
];

/** What an event lights up in the equation. */
function termOf(e: Obj): string {
  if (e.type === "retry") return "backoff";
  if (e.type === "tool_result") return e.ok ? "retry" : "fail";
  if (e.type === "error") return "fail";
  return "retry";
}

function badge(e: Obj): { text: string; colour: string; hatch: boolean } {
  if (e.type === "retry")
    return {
      text: `retry ${e.attempt}`,
      colour: OKABE_ITO.vermillion,
      hatch: true,
    };
  if (e.type === "tool_result")
    return e.ok
      ? { text: "ok", colour: OKABE_ITO.green, hatch: false }
      : { text: "failed", colour: OKABE_ITO.vermillion, hatch: true };
  if (e.type === "error")
    return { text: "loop", colour: OKABE_ITO.vermillion, hatch: true };
  if (e.type === "run_end")
    return { text: "end", colour: OKABE_ITO.sky, hatch: false };
  return { text: "call", colour: "#d4d4d4", hatch: false };
}

export default function RecoveryWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("recovery");
  const [budget, setBudget] = useState<Budget>("0");
  const [loop, setLoop] = useState<Loop>("stop");
  const [hover, setHover] = useState<string | null>(null);
  const key = `r${budget}-${loop}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => events.filter((e) => RECOVERY_TYPES.has(e.type)),
    [events],
  );
  const spans = useMemo(
    () => (events.length ? timeline(events) : []),
    [events],
  );
  const st = useStepper(frames.length, { stepMs: 800, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const end = events[events.length - 1]!;
  const now =
    f.type === "tool_result" || f.type === "model_call"
      ? (f.t as number) + (f.dur as number)
      : f.type === "retry"
        ? (f.t as number) + (f.backoff as number)
        : (f.t as number);
  // the list: tool calls, retries, results and loop errors (model calls are on the timeline)
  const listed = frames
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type !== "model_call" && e.type !== "tool_call");
  const ok = verified(events);

  const visual = (
    <div className="grid min-w-0 gap-3">
      <Timeline
        spans={spans}
        lanes={LANES}
        total={end.elapsed as number}
        now={now}
        dim={(k) =>
          !!hover &&
          !(
            (hover === "backoff" && k === "backoff") ||
            (hover !== "backoff" && k === "tool")
          )
        }
        label="Timeline of the run: model calls, tool attempts and back-off waits"
      />
      <ol className="min-w-0 gap-1 sm:columns-2">
        {listed.map(({ e, i }) => {
          const b = badge(e);
          const shown = i <= st.step;
          return (
            <li
              key={i}
              data-event={e.type}
              className="mb-1 flex min-w-0 break-inside-avoid items-center gap-2 rounded bg-white px-2 py-1 text-[0.72rem] dark:bg-neutral-950"
              style={{
                outline:
                  i === st.step
                    ? `2px solid ${STATE_COLOUR.active}`
                    : undefined,
              }}
            >
              <span
                className="w-14 shrink-0 rounded px-1 text-center font-mono text-[0.68rem] font-semibold text-neutral-950"
                style={{
                  backgroundColor: shown ? b.colour : "#d4d4d4",
                  backgroundImage: shown && b.hatch ? HATCH_CSS : undefined,
                }}
              >
                {shown ? b.text : "…"}
              </span>
              <span className="min-w-0 truncate font-mono text-neutral-800 dark:text-neutral-200">
                {e.type === "run_end"
                  ? (e.status as string)
                  : e.type === "error"
                    ? clip(e.detail as string, 30)
                    : e.type === "retry"
                      ? `wait ${fmtMs(e.backoff as number)}`
                      : `${e.name as string} ${fmtMs(e.dur as number)}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Outcome" value={end.status as string} />
      <Stat
        label="Tests passed at the end"
        value={ok ? "yes" : "no"}
        hint={
          end.status === "done" && !ok ? "the model claimed success" : undefined
        }
      />
      <Stat label="Retries" value={String(end.totals.retries)} />
      <Stat label="Run time" value={fmtMs(end.elapsed as number)} />
    </div>
  );

  return (
    <AnimationPanel
      testId="recovery-widget"
      title="Retries, back-off and loop detection"
      summary="Fix the failing test while the shell fails 30% of attempts at random (seed 0). Back-off 500 ms, doubling; three identical calls in a row count as a loop."
      stepper={st}
      stepLabel="event"
      caption={recoveryCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? termOf(f)}
      onEquationHover={setHover}
      params={
        <>
          <Segmented
            label="Retry budget"
            value={budget}
            options={BUDGETS}
            onChange={setBudget}
          />
          <Segmented
            label="On a loop"
            value={loop}
            options={LOOPS}
            onChange={setLoop}
          />
        </>
      }
    />
  );
}
