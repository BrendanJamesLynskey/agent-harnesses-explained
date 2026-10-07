"use client";

/**
 * Chapter 2: a tool call, step by step. What the model writes (raw text), what the harness
 * parses out of it (a tool name and JSON arguments, or an error), and what the tool returns.
 * The same scripted run in two styles: native tool calls (Qwen2.5's <tool_call> JSON blocks)
 * and ReAct text (Action / Action Input). Turn 2 is deliberately malformed, so the error path
 * and the recovery are part of the run. Frames are `toolcallFrames` of the engine's run.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { toolcallCaption } from "@/lib/agent/captions";
import { toolcallFrames, type Ev, type Obj } from "@/lib/engine/vendor/index";
import { fmtInt } from "@/lib/format";
import { KIND_COLOUR, LANE_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const STYLES = [
  { value: "native", label: "native tool calls" },
  { value: "react", label: "ReAct text" },
] as const;
type Style = (typeof STYLES)[number]["value"];

function Box({
  title,
  colour,
  active,
  muted,
  children,
  testId,
}: {
  title: string;
  colour: string;
  active: boolean;
  muted: boolean;
  children: ReactNode;
  testId: string;
}): JSX.Element {
  return (
    <div
      data-testid={testId}
      data-active={active ? "true" : "false"}
      data-stale={muted ? "true" : "false"}
      className="min-w-0 rounded-md bg-white p-2 dark:bg-neutral-950"
      style={{
        outline: `${active ? 3 : 1.5}px ${muted ? "dashed" : "solid"} ${active ? STATE_COLOUR.active : colour}`,
      }}
    >
      <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
        {title}
      </p>
      {children}
    </div>
  );
}

const PRE =
  "focus-ring max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.72rem] leading-snug text-neutral-800 dark:text-neutral-200";

export default function ToolCallWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("toolcall");
  const [style, setStyle] = useState<Style>("native");
  const [hover, setHover] = useState<string | null>(null);
  const events: Ev[] = useMemo(
    () => (engine.status === "ready" ? engine.runs[style]! : []),
    [engine, style],
  );
  const frames = useMemo(() => toolcallFrames(events), [events]);
  const st = useStepper(frames.length, { stepMs: 1300, resetKey: style });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  // the latest of each kind up to this step
  const latest = (phases: string[]): Obj | null => {
    for (let i = st.step; i >= 0; i--)
      if (phases.includes(frames[i]!.phase as string)) return frames[i]!;
    return null;
  };
  const emit = latest(["emit"]);
  const parsed = latest(["parse", "malformed"]);
  const result = latest(["result"]);
  // parse/result boxes belong to the latest emit; older ones are shown muted
  const emitAt = frames.lastIndexOf(emit!);
  const stale = (x: Obj | null) => x === null || frames.lastIndexOf(x) < emitAt;
  const first = events.find((e) => e.type === "model_call")!;
  const toolsTokens =
    (first.context as Obj[]).find((c) => c.kind === "tools")?.tokens ?? 0;
  const malformed = frames.filter((x) => x.phase === "malformed");
  const badTokens = malformed.reduce((s, x) => s + (x.tokens as number), 0);
  const hl =
    f.phase === "malformed"
      ? "assistant result"
      : f.phase === "emit"
        ? "assistant"
        : "";

  const visual = (
    <div className="grid min-w-0 gap-3 md:grid-cols-3">
      <Box
        title="1 · The model writes"
        colour={LANE_COLOUR.model!}
        active={
          f.phase === "emit" || f.phase === "final" || hover === "assistant"
        }
        muted={false}
        testId="tc-emit"
      >
        <pre
          tabIndex={0}
          role="region"
          className={PRE}
          aria-label="What the model wrote"
        >
          {(emit?.text as string) ?? ""}
        </pre>
        <p className="mt-1 font-mono text-[0.68rem] text-neutral-500 dark:text-neutral-400">
          {emit ? `${fmtInt(emit.tokens as number)} tokens` : ""}
        </p>
      </Box>
      <Box
        title="2 · The harness parses"
        colour={KIND_COLOUR.system!}
        active={
          f.phase === "parse" || f.phase === "malformed" || hover === "result"
        }
        muted={stale(parsed)}
        testId="tc-parse"
      >
        {parsed === null || stale(parsed) ? (
          <p className="text-[0.75rem] text-neutral-500 dark:text-neutral-400">
            {f.phase === "final"
              ? "No tool call: a final answer."
              : "Waiting for the model…"}
          </p>
        ) : parsed.phase === "malformed" ? (
          <div
            className="rounded p-2 text-[0.75rem] text-neutral-900 dark:text-neutral-100"
            style={{
              backgroundColor: "rgb(213 94 0 / 0.15)",
              backgroundImage: HATCH_CSS,
            }}
          >
            <p className="font-semibold">Malformed</p>
            <p className="mt-1">{parsed.detail as string}</p>
            <p className="mt-1 font-mono text-[0.68rem]">
              → error sent back ({fmtInt(parsed.tokens as number)} tokens)
            </p>
          </div>
        ) : (
          <div className="font-mono text-[0.75rem] text-neutral-800 dark:text-neutral-200">
            <p>
              <span className="text-neutral-500 dark:text-neutral-400">
                name{" "}
              </span>
              <span className="font-semibold">{parsed.name as string}</span>
            </p>
            <pre
              tabIndex={0}
              role="region"
              className={PRE}
              aria-label="Parsed arguments"
            >
              {JSON.stringify(parsed.args, null, 1)}
            </pre>
          </div>
        )}
      </Box>
      <Box
        title="3 · The tool returns"
        colour={LANE_COLOUR.tool!}
        active={f.phase === "result"}
        muted={stale(result)}
        testId="tc-result"
      >
        <pre
          tabIndex={0}
          role="region"
          className={PRE}
          aria-label="The tool result"
        >
          {result && !stale(result) ? (result.text as string) : ""}
        </pre>
        <p className="mt-1 font-mono text-[0.68rem] text-neutral-500 dark:text-neutral-400">
          {result && !stale(result)
            ? `${fmtInt(result.tokens as number)} tokens back into the context`
            : ""}
        </p>
      </Box>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Tool definitions"
        value={`${fmtInt(toolsTokens)} tok`}
        hint="sent on every call"
      />
      <Stat
        label="Malformed calls"
        value={String(malformed.length)}
        hint={`${fmtInt(badTokens)} tokens of error feedback`}
      />
      <Stat
        label="Model calls"
        value={String(events.filter((e) => e.type === "model_call").length)}
      />
      <Stat
        label="Input tokens"
        value={fmtInt(events[events.length - 1]!.totals.input_tokens as number)}
        hint="whole run"
      />
    </div>
  );

  return (
    <AnimationPanel
      testId="toolcall-widget"
      title="One tool call, three steps"
      summary={`The scripted fix-the-test run in ${style === "native" ? "native tool-call" : "ReAct text"} style; turn 2's call is malformed on purpose.`}
      stepper={st}
      stepLabel="step"
      caption={toolcallCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? hl}
      onEquationHover={setHover}
      params={
        <Segmented
          label="Style"
          value={style}
          options={STYLES}
          onChange={setStyle}
        />
      }
    />
  );
}
