"use client";

/**
 * Chapter 1's hero: the agent loop. The harness sends the context to the model, the model
 * writes, the harness runs the tool it asked for, the result joins the context, and round
 * again. The context window fills underneath, segment by segment, token by token while the
 * model writes. Every frame is `loopFrames` of a run of the engine: a scripted policy, or a
 * real trace from Qwen2.5-1.5B replayed token-exactly.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { ContextBar, KindLegend } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { loopCaption } from "@/lib/agent/captions";
import { loopFrames, type Obj } from "@/lib/engine/vendor/index";
import { fmtInt, fmtMs } from "@/lib/format";
import { KIND_COLOUR, LANE_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const SOURCES = [
  { value: "scripted", label: "scripted policy" },
  { value: "qwen-fix-test-native", label: "Qwen: fix (native)" },
  { value: "qwen-fix-test-react", label: "Qwen: fix (ReAct)" },
  { value: "qwen-lookup-native", label: "Qwen: search" },
] as const;
type Source = (typeof SOURCES)[number]["value"];

const NOTE: Record<Source, string> = {
  scripted:
    "A scripted policy: the steps a capable model would take. Deterministic, so every frame is testable.",
  "qwen-fix-test-native":
    "Recorded from Qwen2.5-1.5B (Q4_K_M, llama.cpp, CPU) and replayed token-exactly. It lists the files, then claims calc.py is missing and stops.",
  "qwen-fix-test-react":
    "Recorded, ReAct style. It runs the tests, misreads the failure, wraps its JSON in a code fence twice (malformed), then claims success without changing anything.",
  "qwen-lookup-native":
    "Recorded. Two good searches in one turn (parallel calls), then no calculator: wrong arithmetic in prose, cut off at the 384-token output limit.",
};

const W = 360;
const NODE = { model: 8, harness: 135, tools: 262 } as const;
const NODE_W = 90;
const TOP = 34;
const NODE_H = 46;

type Arrow = "prompt" | "output" | "call" | "result";
const ARROW_OF: Record<string, Arrow | null> = {
  call: "prompt",
  output: "output",
  tool: "call",
  result: "result",
};

function arrowPath(a: Arrow): {
  d: string;
  from: [number, number];
  to: [number, number];
} {
  const mx = NODE.model + NODE_W;
  const hx = NODE.harness;
  const hr = NODE.harness + NODE_W;
  const tx = NODE.tools;
  const up = TOP + 12;
  const down = TOP + NODE_H - 12;
  if (a === "prompt")
    return { d: `M${hx} ${up} L${mx} ${up}`, from: [hx, up], to: [mx, up] };
  if (a === "output")
    return {
      d: `M${mx} ${down} L${hx} ${down}`,
      from: [mx, down],
      to: [hx, down],
    };
  if (a === "call")
    return { d: `M${hr} ${up} L${tx} ${up}`, from: [hr, up], to: [tx, up] };
  return {
    d: `M${tx} ${down} L${hr} ${down}`,
    from: [tx, down],
    to: [hr, down],
  };
}

export default function LoopWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("loop");
  const [source, setSource] = useState<Source>("scripted");
  const font = useSvgFont(W);
  const fs = font.fs;

  const frames = useMemo(
    () => (engine.status === "ready" ? loopFrames(engine.runs[source]!) : []),
    [engine, source],
  );
  const st = useStepper(frames.length, {
    stepMs: 900,
    smooth: true,
    resetKey: source,
  });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const prev = st.step > 0 ? frames[st.step - 1]! : null;
  const max = Math.max(...frames.map((x) => x.total as number)) * 1.04;
  const arrow = ARROW_OF[f.phase as string] ?? null;
  // while the model writes, its message fills in token by token
  const assistant = (p: Obj | null) =>
    ((p?.parts as Obj[] | undefined) ?? []).find((x) => x.kind === "assistant")
      ?.tokens ?? 0;
  const grow =
    f.phase === "output"
      ? { kind: "assistant", of: assistant(f) - assistant(prev), frac: st.frac }
      : undefined;
  let turn: number | null = null;
  for (let i = st.step; i >= 0 && turn === null; i--)
    if (typeof frames[i]!.turn === "number") turn = frames[i]!.turn as number;
  // phones: shorter labels inside the boxes (the same facts)
  const short = (s: string) =>
    font.narrow && s.length > 9 ? `${s.slice(0, 8)}…` : s;
  let lastOutput = "";
  for (let i = st.step; i >= 0; i--)
    if (frames[i]!.phase === "output") {
      lastOutput = frames[i]!.text as string;
      break;
    }
  let sent = 0;
  for (let i = 0; i <= st.step; i++)
    if (frames[i]!.phase === "call") sent += frames[i]!.input as number;
  const kinds = [
    ...new Set(
      frames.flatMap((x) => (x.parts as Obj[]).map((p) => p.kind as string)),
    ),
  ];
  const hl =
    f.phase === "call"
      ? "system tools task"
      : f.phase === "output"
        ? "assistant"
        : f.phase === "result"
          ? "result"
          : "";

  const nodeBox = (
    key: keyof typeof NODE,
    label: string,
    sub: string,
    colour: string,
    active: boolean,
  ) => (
    <g key={key} data-node={key}>
      <rect
        x={NODE[key]}
        y={TOP}
        width={NODE_W}
        height={NODE_H}
        rx={7}
        className="fill-white dark:fill-neutral-950"
        stroke={active ? STATE_COLOUR.active : colour}
        strokeWidth={active ? 3 : 1.5}
      />
      <rect
        x={NODE[key]}
        y={TOP}
        width={NODE_W}
        height={6}
        rx={3}
        fill={colour}
      />
      <text
        x={NODE[key] + NODE_W / 2}
        y={TOP + 26}
        textAnchor="middle"
        style={{ fontSize: fs(12) }}
        className="fill-neutral-900 font-semibold dark:fill-neutral-100"
      >
        {label}
      </text>
      <text
        x={NODE[key] + NODE_W / 2}
        y={TOP + 40}
        textAnchor="middle"
        style={{ fontSize: fs(9.5) }}
        className="fill-neutral-600 font-mono dark:fill-neutral-400"
      >
        {sub}
      </text>
    </g>
  );

  const pkt = arrow ? arrowPath(arrow) : null;
  const t = Math.min(1, st.frac * 1.2);
  const dot = pkt
    ? [
        pkt.from[0] + (pkt.to[0] - pkt.from[0]) * t,
        pkt.from[1] + (pkt.to[1] - pkt.from[1]) * t,
      ]
    : null;
  const arrowLabel: Record<Arrow, string> = {
    prompt: f.phase === "call" ? `${fmtInt(f.input as number)} tok` : "prompt",
    output:
      f.phase === "output" ? `${fmtInt(f.output as number)} tok` : "output",
    call: f.phase === "tool" ? short(f.name as string) : "call",
    result:
      f.phase === "result" ? `${fmtInt(f.tokens as number)} tok` : "result",
  };

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} 100`}
        className="h-auto w-full"
        role="img"
        aria-label={`The agent loop: model, harness and tools. Now: ${loopCaption(f)}`}
      >
        <defs>
          <marker
            id="loop-arrow"
            viewBox="0 0 8 8"
            refX={7}
            refY={4}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 z" className="fill-neutral-500" />
          </marker>
        </defs>
        {(["prompt", "output", "call", "result"] as Arrow[]).map((a) => {
          const p = arrowPath(a);
          const on = a === arrow;
          const above = a === "prompt" || a === "call";
          return (
            <g key={a} data-arrow={a}>
              <path
                d={p.d}
                stroke={on ? STATE_COLOUR.active : "currentColor"}
                className={on ? "" : "text-neutral-400 dark:text-neutral-600"}
                strokeWidth={on ? 2.5 : 1.2}
                markerEnd="url(#loop-arrow)"
              />
              <text
                x={(p.from[0] + p.to[0]) / 2}
                y={above ? p.from[1] - 18 : p.from[1] + 26}
                textAnchor="middle"
                style={{ fontSize: fs(9.5) }}
                className={
                  on
                    ? "fill-neutral-900 font-mono dark:fill-neutral-100"
                    : "fill-neutral-500 font-mono dark:fill-neutral-400"
                }
              >
                {arrowLabel[a]}
              </text>
            </g>
          );
        })}
        {nodeBox(
          "model",
          "Model",
          turn === null ? "waiting" : `turn ${turn}`,
          LANE_COLOUR.model!,
          f.phase === "output",
        )}
        {nodeBox(
          "harness",
          "Harness",
          f.phase === "error"
            ? "error!"
            : f.phase === "compact"
              ? "compacting"
              : f.phase === "done"
                ? "done"
                : "loop",
          KIND_COLOUR.system!,
          f.phase === "error" ||
            f.phase === "compact" ||
            f.phase === "done" ||
            f.phase === "call",
        )}
        {nodeBox(
          "tools",
          "Tools",
          f.phase === "tool" || f.phase === "result"
            ? short(f.name as string)
            : "idle",
          LANE_COLOUR.tool!,
          f.phase === "tool",
        )}
        {dot && (
          <circle cx={dot[0]} cy={dot[1]} r={5} fill={STATE_COLOUR.active} />
        )}
      </svg>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          <span>Context window</span>
          <span className="font-mono">{fmtInt(f.total as number)} tokens</span>
        </div>
        <ContextBar
          parts={f.parts as never}
          max={max}
          grow={grow}
          label="Context window"
        />
        <KindLegend kinds={kinds} />
      </div>
      <div className="mt-3">
        <p className="text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          Latest model output
        </p>
        <pre
          tabIndex={0}
          role="region"
          aria-label="Latest model output"
          className="focus-ring mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
        >
          {lastOutput || "(nothing yet)"}
        </pre>
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Turn" value={turn === null ? "–" : String(turn)} />
      <Stat label="Context" value={`${fmtInt(f.total as number)} tok`} />
      <Stat
        label="Sent to model"
        value={`${fmtInt(sent)} tok`}
        hint="the whole context, every turn"
      />
      <Stat label="Clock" value={fmtMs(f.t as number)} hint="simulated" />
    </div>
  );

  return (
    <AnimationPanel
      testId="loop-widget"
      title="The agent loop"
      summary={NOTE[source]}
      stepper={st}
      stepLabel="event"
      caption={loopCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <Segmented
          label="Run"
          value={source}
          options={SOURCES}
          onChange={setSource}
        />
      }
    />
  );
}
