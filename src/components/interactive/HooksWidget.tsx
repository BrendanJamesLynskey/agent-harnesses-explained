"use client";

/**
 * Chapter 7: hooks and the sandbox. Each tool call travels through the harness's
 * checkpoints in order: the permission rules, the pre-tool hooks (which can block a call or
 * rewrite it), then the tool itself, where shell commands run inside the sandbox boundary
 * and the file tools do not, then the post-tool hooks (which can add to the result). The
 * same task under three sandbox modes, with and without hooks. Frames are the engine's
 * `pipelineFrames`.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { pipelineCaption } from "@/lib/agent/captions";
import { pipelineFrames, type Obj } from "@/lib/engine/vendor/index";
import { clip, fmtMs } from "@/lib/format";
import { OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const SANDBOXES = [
  { value: "off", label: "no sandbox" },
  { value: "workspace", label: "workspace" },
  { value: "read_only", label: "read-only" },
] as const;
const HOOKS = [
  { value: "hooks", label: "three hooks" },
  { value: "nohooks", label: "no hooks" },
] as const;
type Sandbox = (typeof SANDBOXES)[number]["value"];
type Hooks = (typeof HOOKS)[number]["value"];

const BOUNDARY: Record<Sandbox, string> = {
  off: "no boundary: a command can reach the whole machine and the network",
  workspace: "writes inside the repository only; no network",
  read_only: "no writes at all; no network",
};

const OUTCOME_COLOUR: Record<string, string> = {
  ok: OKABE_ITO.green,
  error: OKABE_ITO.orange,
  denied: OKABE_ITO.vermillion,
  blocked: OKABE_ITO.vermillion,
  sandboxed: OKABE_ITO.vermillion,
};
const OUTCOME_WORD: Record<string, string> = {
  ok: "ran",
  error: "failed",
  denied: "refused",
  blocked: "hook",
  sandboxed: "sandbox",
};

/** Which box of the diagram a frame lights up (and which equation term). */
function stageOf(f: Obj): string {
  if (f.stage === "call") return "model";
  if (f.stage === "permission") return "perm";
  if (f.stage === "hook") return f.phase === "pre" ? "hook" : "post";
  if (f.kind === "blocked") return "hook";
  if (f.kind === "denied") return "perm";
  return f.name === "run_shell" ? "sandbox" : "files";
}
const TERM: Record<string, string> = {
  model: "perm",
  perm: "perm",
  hook: "hook",
  post: "hook",
  sandbox: "sandbox",
  files: "perm",
};

export default function HooksWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("hooks");
  const [sandbox, setSandbox] = useState<Sandbox>("workspace");
  const [hooks, setHooks] = useState<Hooks>("hooks");
  const [hover, setHover] = useState<string | null>(null);
  const key = `${sandbox}-${hooks}`;
  const events = useMemo(
    () => (engine.status === "ready" ? engine.runs[key]! : []),
    [engine, key],
  );
  const frames = useMemo(
    () => (events.length ? pipelineFrames(events) : []),
    [events],
  );
  const st = useStepper(frames.length, { stepMs: 900, resetKey: key });
  if (engine.status !== "ready" || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const stage = stageOf(f);
  const calls = frames.filter((x) => x.stage === "call");
  const results = new Map(
    frames
      .map((x, i) => [x, i] as const)
      .filter(([x]) => x.stage === "result")
      .map(([x, i]) => [x.call as string, { f: x, i }]),
  );
  const end = events[events.length - 1]!;
  const stopped = frames.filter(
    (x) => x.stage === "result" && x.kind === "sandboxed",
  ).length;
  const blocked = frames.filter(
    (x) => x.stage === "result" && x.kind === "blocked",
  ).length;
  const current = calls.find((c) => c.call === f.call)!;
  const done = f.stage === "result";
  const kind = done ? (f.kind as string) : null;

  const box = (id: string, title: string, sub?: string) => {
    const on = stage === id;
    const fail =
      on &&
      done &&
      (kind === "blocked" || kind === "denied" || kind === "sandboxed");
    return (
      <div
        data-stage={id}
        data-active={on ? "true" : "false"}
        className="min-w-0 rounded bg-white px-2 py-1.5 text-center text-[0.72rem] dark:bg-neutral-950"
        style={{
          outline: on
            ? `2px solid ${fail ? STATE_COLOUR.stalled : STATE_COLOUR.active}`
            : "1px solid rgb(163 163 163 / 0.5)",
          backgroundImage: fail ? HATCH_CSS : undefined,
          opacity: hover && TERM[id] !== hover ? 0.4 : 1,
        }}
      >
        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
          {title}
        </div>
        {sub && (
          <div className="text-[0.68rem] text-neutral-600 dark:text-neutral-400">
            {sub}
          </div>
        )}
      </div>
    );
  };
  const arrow = (
    <span
      aria-hidden
      className="self-center text-center text-neutral-500 dark:text-neutral-400"
    >
      →
    </span>
  );

  const visual = (
    <div className="grid min-w-0 gap-3">
      <p
        data-stage="model"
        data-active={stage === "model" ? "true" : "false"}
        className="min-w-0 truncate rounded bg-white px-2 py-1 font-mono text-[0.72rem] text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
        style={{
          outline:
            stage === "model" ? `2px solid ${STATE_COLOUR.active}` : undefined,
        }}
      >
        call {calls.indexOf(current) + 1}/{calls.length}:{" "}
        {current.name as string}({clip(f.subject as string, 34)})
      </p>
      <div
        role="img"
        aria-label={`The checkpoints a call passes; now at ${stage}.`}
        className="grid min-w-0 grid-cols-[1fr_auto_1fr] gap-1 sm:grid-cols-[1fr_auto_1fr_auto_1.6fr_auto_1fr]"
      >
        {box("perm", "Permissions", "allow · ask · deny")}
        {arrow}
        {box(
          "hook",
          "Pre-tool hooks",
          hooks === "hooks" ? "block · rewrite" : "none",
        )}
        <span
          aria-hidden
          className="hidden self-center text-neutral-500 sm:block"
        >
          →
        </span>
        <div className="col-span-3 grid min-w-0 gap-1 sm:col-span-1">
          <div
            data-boundary={sandbox}
            className="min-w-0 rounded p-1"
            style={{
              border:
                sandbox === "off"
                  ? "1px dotted rgb(163 163 163 / 0.8)"
                  : `2px dashed ${OKABE_ITO.vermillion}`,
            }}
          >
            {box(
              "sandbox",
              "Shell",
              `sandbox: ${SANDBOXES.find((s) => s.value === sandbox)!.label}`,
            )}
          </div>
          {box("files", "File tools", "outside the sandbox")}
        </div>
        <span
          aria-hidden
          className="hidden self-center text-neutral-500 sm:block"
        >
          →
        </span>
        {box("post", "Post-tool hooks", hooks === "hooks" ? "append" : "none")}
      </div>
      <p className="text-[0.7rem] text-neutral-600 dark:text-neutral-400">
        Sandbox boundary (dashed): {BOUNDARY[sandbox]}.
      </p>
      <ol className="min-w-0 gap-1 sm:columns-2">
        {calls.map((c, i) => {
          const r = results.get(c.call as string);
          const shown = r && r.i <= st.step;
          const k = shown ? (r.f.kind as string) : null;
          return (
            <li
              key={i}
              data-call={i}
              className="mb-1 flex min-w-0 break-inside-avoid items-center gap-2 rounded bg-white px-2 py-1 text-[0.72rem] dark:bg-neutral-950"
              style={{
                outline:
                  c.call === f.call
                    ? `2px solid ${STATE_COLOUR.active}`
                    : undefined,
              }}
            >
              <span
                className="w-14 shrink-0 rounded px-1 text-center font-mono text-[0.68rem] font-semibold text-neutral-950"
                style={{
                  backgroundColor: k ? OUTCOME_COLOUR[k] : "#d4d4d4",
                  backgroundImage:
                    k && k !== "ok" && k !== "error" ? HATCH_CSS : undefined,
                }}
              >
                {k ? OUTCOME_WORD[k] : "…"}
              </span>
              <span className="min-w-0 truncate font-mono text-neutral-800 dark:text-neutral-200">
                {c.name as string}(
                {clip((shown ? r.f.subject : c.subject) as string, 24)})
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Calls" value={String(calls.length)} />
      <Stat label="Blocked by hooks" value={String(blocked)} />
      <Stat label="Stopped by sandbox" value={String(stopped)} />
      <Stat label="Run time" value={fmtMs(end.elapsed as number)} />
    </div>
  );

  return (
    <AnimationPanel
      testId="hooks-widget"
      title="Every call passes the checkpoints"
      summary="Fix the failing test, then pip install a plugin, rm -rf build and rm -rf ~/.cache/pytest. Hooks: block rm, rewrite pytest to pytest -q, lint after an edit."
      stepper={st}
      stepLabel="step"
      caption={pipelineCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? TERM[stage]}
      onEquationHover={setHover}
      params={
        <>
          <Segmented
            label="Sandbox"
            value={sandbox}
            options={SANDBOXES}
            onChange={setSandbox}
          />
          <Segmented
            label="Hooks"
            value={hooks}
            options={HOOKS}
            onChange={setHooks}
          />
        </>
      }
    />
  );
}
