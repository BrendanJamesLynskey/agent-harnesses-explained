"use client";

/**
 * Chapter 6: sub-agents. The parent's and the sub-agent's context windows side by side: the
 * parent hands the reading to a sub-agent, which starts with a fresh context, fills it with
 * the notes, and hands back a short report; only the report enters the parent's context.
 * The same task done inline (the parent reads every note itself) for comparison, with a
 * roomy window or a tight one that forces summarising compaction. Frames are the engine's
 * `agentsFrames`; the timeline is its `timeline`.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { ContextBar, KindLegend } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Timeline, type Lane } from "@/components/agent/Timeline";
import { Segmented, Stat } from "@/components/ui/Controls";
import { agentsCaption } from "@/lib/agent/captions";
import {
  agentsFrames,
  timeline,
  type Ev,
  type Obj,
  type Part,
} from "@/lib/engine/vendor/index";
import { fmtInt, fmtMs, fmtUsd } from "@/lib/format";
import { LANE_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const SETUPS = [
  { value: "subagent", label: "with a sub-agent" },
  { value: "inline", label: "inline" },
] as const;
const WINDOWS = [
  { value: "roomy", label: "32,768 tokens" },
  { value: "tight", label: "3,000, summarising" },
] as const;
type Setup = (typeof SETUPS)[number]["value"];
type Win = (typeof WINDOWS)[number]["value"];

const LANES: Lane[] = [
  {
    key: "parent",
    label: "parent",
    colour: OKABE_ITO.orange,
    match: (s) => s.lane === "model" && s.agent === "main",
  },
  {
    key: "child",
    label: "sub-agent",
    colour: OKABE_ITO.sky,
    match: (s) => s.lane === "model" && s.agent !== "main",
  },
  {
    key: "tool",
    label: "tools",
    colour: LANE_COLOUR.tool!,
    match: (s) => s.lane === "tool" && s.label !== "task",
  },
];

function summaryOf(ev: Ev[]): Obj {
  const end = ev[ev.length - 1]!;
  const peak = (a: string) =>
    Math.max(
      0,
      ...ev
        .filter(
          (e) =>
            e.type === "model_call" && e.agent === a && e.purpose === "act",
        )
        .map((e) => e.input_tokens as number),
    );
  return {
    peak: peak("main"),
    input: end.totals.input_tokens,
    cost: end.totals.cost,
    elapsed: end.elapsed,
  };
}

export default function SubagentWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("subagents");
  const [setup, setSetup] = useState<Setup>("subagent");
  const [win, setWin] = useState<Win>("roomy");
  const [hover, setHover] = useState<string | null>(null);
  const key = `${setup}-${win}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => (events.length ? agentsFrames(events) : []),
    [events],
  );
  const spans = useMemo(
    () => (events.length ? timeline(events) : []),
    [events],
  );
  // one scale for both setups at this window, so the inline parent's longer bar shows
  const max = useMemo(() => {
    if (engine.status !== "ready") return 1;
    let m = 1;
    for (const s of SETUPS)
      for (const f of agentsFrames(engine.runs[`${s.value}-${win}`]!))
        for (const v of Object.values(f.totals as Record<string, number>))
          m = Math.max(m, v);
    return m;
  }, [engine, win]);
  const st = useStepper(frames.length, { stepMs: 900, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const end = events[events.length - 1]!;
  const parts = f.parts as Record<string, Part[]>;
  const sent = f.sent as Record<string, number>;
  const busy = f.busy as Record<string, number>;
  const active = f.agent === "main" ? "parent" : "child";
  const hasChild = setup === "subagent";
  const kinds = [
    ...new Set(
      frames.flatMap((x) =>
        Object.values(x.parts as Record<string, Part[]>).flatMap((p) =>
          p.map((q) => q.kind),
        ),
      ),
    ),
  ];
  const handoff =
    f.phase === "spawn"
      ? `→ task prompt, ${fmtInt(f.prompt_tokens)} tokens`
      : f.phase === "return"
        ? `← report, ${fmtInt(f.summary_tokens)} tokens`
        : null;

  const row = (agent: string, who: "parent" | "child", label: string) => {
    const on = active === who && (who === "parent" || agent in parts);
    return (
      <div
        data-agent={who}
        data-active={on ? "true" : "false"}
        className="min-w-0 rounded p-2"
        style={{
          outline: on ? `2px solid ${STATE_COLOUR.active}` : undefined,
          opacity: hover && hover !== who ? 0.35 : 1,
        }}
      >
        <div className="flex items-baseline justify-between gap-2 text-[0.72rem]">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {label}
          </span>
          <span className="font-mono text-neutral-600 dark:text-neutral-400">
            {agent in parts
              ? `${fmtInt((f.totals as Obj)[agent] ?? 0)} tokens in context`
              : "not started"}
          </span>
        </div>
        <div className="mt-1">
          <ContextBar
            parts={parts[agent] ?? []}
            max={max}
            height={22}
            label={`${label}'s context`}
          />
        </div>
        <p className="mt-1 text-[0.7rem] text-neutral-600 dark:text-neutral-400">
          sent to the model so far: {fmtInt(sent[agent] ?? 0)} tokens · model
          time {fmtMs(busy[agent] ?? 0)}
        </p>
      </div>
    );
  };

  const visual = (
    <div className="grid min-w-0 gap-2">
      {row("main", "parent", "Parent")}
      <div
        aria-hidden
        className="h-5 text-center font-mono text-[0.72rem] text-neutral-700 dark:text-neutral-300"
      >
        {handoff ?? (hasChild ? "↕" : "")}
      </div>
      {hasChild ? (
        row("sub1", "child", "Sub-agent")
      ) : (
        <p className="rounded bg-white p-2 text-[0.72rem] text-neutral-600 dark:bg-neutral-950 dark:text-neutral-400">
          Inline: no sub-agent. The parent reads every note itself, and every
          note stays in its context for every later turn.
        </p>
      )}
      <KindLegend kinds={kinds} />
      <Timeline
        spans={spans}
        lanes={hasChild ? LANES : LANES.filter((l) => l.key !== "child")}
        total={end.elapsed as number}
        now={f.t as number}
        dim={(k) => !!hover && k !== hover && k !== "tool"}
        label="Timeline: the parent's and the sub-agent's model calls, and the tools"
      />
    </div>
  );

  const compare = (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      aria-label="Inline against a sub-agent"
    >
      <table className="w-full min-w-80 text-left text-[0.72rem]">
        <caption className="text-left text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          The same task, window {WINDOWS.find((w) => w.value === win)!.label}
        </caption>
        <thead>
          <tr className="text-neutral-600 dark:text-neutral-400">
            <th className="py-1 pr-2 font-medium">Setup</th>
            <th className="py-1 pr-2 font-medium">Parent peak</th>
            <th className="py-1 pr-2 font-medium">Tokens sent</th>
            <th className="py-1 pr-2 font-medium">Cost</th>
            <th className="py-1 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {SETUPS.map((s) => {
            const x = summaryOf(engine.runs[`${s.value}-${win}`]!);
            return (
              <tr
                key={s.value}
                className={
                  s.value === setup
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : "text-neutral-700 dark:text-neutral-300"
                }
              >
                <td className="py-0.5 pr-2">{s.label}</td>
                <td className="py-0.5 pr-2">{fmtInt(x.peak)}</td>
                <td className="py-0.5 pr-2">{fmtInt(x.input)}</td>
                <td className="py-0.5 pr-2">{fmtUsd(x.cost)}</td>
                <td className="py-0.5">{fmtMs(x.elapsed)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const s = summaryOf(events);
  const stats = (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Parent peak" value={fmtInt(s.peak)} hint="tokens" />
        <Stat label="Tokens sent" value={fmtInt(s.input)} hint="all agents" />
        <Stat label="Cost" value={fmtUsd(s.cost)} />
        <Stat label="Time" value={fmtMs(s.elapsed)} />
      </div>
      {compare}
    </div>
  );

  return (
    <AnimationPanel
      testId="subagent-widget"
      title="The parent and its sub-agent"
      summary="Read four long design notes and do two sums. With a sub-agent, the notes fill the sub-agent's context, not the parent's."
      stepper={st}
      stepLabel="event"
      caption={agentsCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? active}
      onEquationHover={setHover}
      params={
        <>
          <Segmented
            label="Setup"
            value={setup}
            options={SETUPS}
            onChange={setSetup}
          />
          <Segmented
            label="Window"
            value={win}
            options={WINDOWS}
            onChange={setWin}
          />
        </>
      }
    />
  );
}
