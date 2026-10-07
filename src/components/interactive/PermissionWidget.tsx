"use client";

/**
 * Chapter 5: permissions and the human in the loop. The rule table is evaluated against
 * each tool call as it happens (deny rules first, then the mode, then ask and allow rules,
 * then the mode's default); an "ask" stops the run until the simulated human answers, and
 * that wait appears on the timeline. The same task under four modes, with and without the
 * rules. Frames are `permissionFrames` and `timeline` of the engine's runs.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { permissionCaption } from "@/lib/agent/captions";
import {
  permissionFrames,
  timeline,
  type Ev,
  type Obj,
} from "@/lib/engine/vendor/index";
import { clip, fmtMs } from "@/lib/format";
import { LANE_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const MODES = [
  { value: "auto", label: "auto" },
  { value: "default", label: "default" },
  { value: "ask", label: "ask every time" },
  { value: "read_only", label: "read-only" },
] as const;
const RULES = [
  { value: "rule", label: "deny rm, allow pytest" },
  { value: "norule", label: "no rules" },
] as const;
type Mode = (typeof MODES)[number]["value"];
type Rules = (typeof RULES)[number]["value"];

const MODE_ROW: Record<Mode, { reason: string; text: string }[]> = {
  auto: [{ reason: "mode: auto", text: "anything else → allow" }],
  default: [
    { reason: "mode: default (reads allowed)", text: "reads → allow" },
    { reason: "mode: default (writes ask)", text: "writes and shell → ask" },
  ],
  ask: [{ reason: "mode: ask every time", text: "every call → ask" }],
  read_only: [
    { reason: "mode: read-only", text: "writes and shell → deny" },
    { reason: "mode: read-only", text: "reads → allow" },
  ],
};

const DECISION_COLOUR: Record<string, string> = {
  allow: OKABE_ITO.green,
  ask: OKABE_ITO.purple,
  deny: OKABE_ITO.vermillion,
};

const LANES = ["model", "human", "tool"] as const;

function summaryOf(ev: Ev[]): Obj {
  const end = ev[ev.length - 1]!;
  const rm = permissionFrames(ev).find((f) =>
    (f.subject as string).startsWith("rm "),
  );
  return {
    elapsed: end.elapsed,
    prompts: end.totals.human_prompts,
    refused: (end.totals.denied as number) + (end.totals.blocked as number),
    rm: rm ? (rm.outcome === "ok" ? "ran" : "stopped") : "–",
  };
}

export default function PermissionWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("permissions");
  const [mode, setMode] = useState<Mode>("default");
  const [rules, setRules] = useState<Rules>("rule");
  const key = `${mode}-${rules}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => (events.length ? permissionFrames(events) : []),
    [events],
  );
  const spans = useMemo(
    () => (events.length ? timeline(events) : []),
    [events],
  );
  const st = useStepper(frames.length, { stepMs: 1400, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const end = events[events.length - 1]!;
  const T = end.elapsed as number;
  const now = (f.done as number | undefined) ?? (f.t as number);
  const ruleRows = [
    ...(rules === "rule"
      ? [
          {
            reason: "rule: deny run_shell(rm *)",
            text: "deny  run_shell(rm *)",
          },
          {
            reason: "rule: allow run_shell(pytest*)",
            text: "allow run_shell(pytest*)",
          },
        ]
      : []),
    ...MODE_ROW[mode],
  ];
  const hl =
    f.decision === "ask" ? "wait" : f.outcome === "ok" ? "tool" : "model";

  const visual = (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            Rules, in the order they are checked
          </p>
          <ol className="mt-1 space-y-1 font-mono text-[0.72rem]">
            {ruleRows.map((r, i) => {
              const on =
                r.reason === f.reason &&
                (r.reason !== "mode: read-only" ||
                  (r.text.startsWith("reads")
                    ? f.decision === "allow"
                    : f.decision === "deny"));
              return (
                <li
                  key={i}
                  data-rule={r.reason}
                  data-active={on ? "true" : "false"}
                  className="rounded bg-white px-2 py-1 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                  style={{
                    outline: on
                      ? `2px solid ${STATE_COLOUR.active}`
                      : "1px solid rgb(163 163 163 / 0.5)",
                  }}
                >
                  {r.text}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
            The calls
          </p>
          <ol className="mt-1 space-y-1">
            {frames.map((x, i) => (
              <li
                key={i}
                data-call={i}
                className="flex min-w-0 items-center gap-2 rounded bg-white px-2 py-1 text-[0.72rem] dark:bg-neutral-950"
                data-future={i > st.step ? "true" : "false"}
                style={{
                  outline:
                    i === st.step
                      ? `2px solid ${STATE_COLOUR.active}`
                      : undefined,
                }}
              >
                <span
                  className="w-12 shrink-0 rounded px-1 text-center font-mono text-[0.68rem] font-semibold text-neutral-950"
                  style={{
                    backgroundColor:
                      i <= st.step
                        ? DECISION_COLOUR[x.decision as string]
                        : "#d4d4d4",
                    backgroundImage:
                      i <= st.step && x.decision === "deny"
                        ? HATCH_CSS
                        : undefined,
                  }}
                >
                  {i <= st.step ? (x.decision as string) : "…"}
                </span>
                <span
                  className={`min-w-0 truncate font-mono ${i <= st.step ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-500 dark:text-neutral-400"}`}
                >
                  {x.name as string}({clip(x.subject as string, 22)})
                </span>
                <span className="ml-auto shrink-0 text-neutral-500 dark:text-neutral-400">
                  {i <= st.step
                    ? x.outcome === "ok"
                      ? "ran"
                      : x.outcome === "denied"
                        ? "not run"
                        : (x.outcome as string)
                    : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div
        role="img"
        aria-label={`Timeline of the run, ${fmtMs(T)} in all; the model, the human and the tools in three lanes.`}
        className="relative"
      >
        {LANES.map((lane) => (
          <div key={lane} className="flex items-center gap-2 py-0.5">
            <span className="w-12 shrink-0 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
              {lane}
            </span>
            <div
              className="relative h-4 min-w-0 flex-1 rounded-sm bg-neutral-100 dark:bg-neutral-900"
              data-lane={lane}
            >
              {spans
                .filter((s) => s.lane === lane)
                .map((s, k) => (
                  <span
                    key={k}
                    className="absolute inset-y-0"
                    style={{
                      left: `${(100 * (s.start as number)) / T}%`,
                      width: `max(2px, ${(100 * ((s.end as number) - (s.start as number))) / T}%)`,
                      backgroundColor: LANE_COLOUR[lane],
                      opacity: (s.start as number) <= now ? 1 : 0.25,
                    }}
                  />
                ))}
              <span
                aria-hidden
                className="absolute -inset-y-1 w-0.5"
                style={{
                  left: `${(100 * now) / T}%`,
                  backgroundColor: STATE_COLOUR.active,
                }}
              />
            </div>
          </div>
        ))}
        <p className="text-right text-[0.7rem] text-neutral-600 dark:text-neutral-400">
          {fmtMs(T)} in all
        </p>
      </div>
    </div>
  );

  const compare = (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      aria-label="Every mode on the same task"
    >
      <table className="w-full min-w-80 text-left text-[0.72rem]">
        <caption className="text-left text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          The same task under every mode (
          {rules === "rule" ? "with the rules" : "no rules"})
        </caption>
        <thead>
          <tr className="text-neutral-600 dark:text-neutral-400">
            <th className="py-1 pr-2 font-medium">Mode</th>
            <th className="py-1 pr-2 font-medium">Time</th>
            <th className="py-1 pr-2 font-medium">Questions</th>
            <th className="py-1 pr-2 font-medium">Refused</th>
            <th className="py-1 font-medium">rm -rf</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {MODES.map((m) => {
            const s = summaryOf(engine.runs[`${m.value}-${rules}`]!);
            return (
              <tr
                key={m.value}
                className={
                  m.value === mode
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : "text-neutral-700 dark:text-neutral-300"
                }
              >
                <td className="py-0.5 pr-2">{m.label}</td>
                <td className="py-0.5 pr-2">{fmtMs(s.elapsed)}</td>
                <td className="py-0.5 pr-2">{s.prompts}</td>
                <td className="py-0.5 pr-2">{s.refused}</td>
                <td className="py-0.5">{s.rm}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const stats = (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Run time" value={fmtMs(T)} />
        <Stat
          label="Questions"
          value={String(end.totals.human_prompts)}
          hint={`waiting ${fmtMs(end.totals.human_wait as number)}`}
        />
        <Stat
          label="Refused"
          value={String(
            (end.totals.denied as number) + (end.totals.blocked as number),
          )}
        />
        <Stat label="Calls" value={String(frames.length)} />
      </div>
      {compare}
    </div>
  );

  return (
    <AnimationPanel
      testId="permission-widget"
      title="Every call meets the rules"
      summary="Fix the failing test, then tidy up with rm -rf build and check git status. The simulated human takes 3–9 s to answer and approves everything."
      stepper={st}
      stepLabel="call"
      caption={permissionCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <>
          <Segmented
            label="Mode"
            value={mode}
            options={MODES}
            onChange={setMode}
          />
          <Segmented
            label="Rules"
            value={rules}
            options={RULES}
            onChange={setRules}
          />
        </>
      }
    />
  );
}
