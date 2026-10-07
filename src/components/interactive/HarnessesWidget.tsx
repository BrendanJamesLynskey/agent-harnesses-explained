"use client";

/**
 * Chapter 9: harnesses compared. The same scripted model does the same task under six policy
 * sets, each imitating one public harness's documented defaults (tool-call format, parallel
 * calls, approvals, sandbox, context management). A policy imitation, not the product: the
 * rows show what those choices alone do to time, questions, stopped calls and tokens. One
 * column per tool call, filled in call by call; frames are the engine's `permissionFrames`
 * of each run, side by side.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented } from "@/components/ui/Controls";
import { harnessCaption } from "@/lib/agent/captions";
import { HARNESSES } from "@/lib/agent/harnesses";
import { permissionFrames, type Obj } from "@/lib/engine/vendor/index";
import { fmtInt, fmtMs, fmtUsd } from "@/lib/format";
import { OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

type Key = (typeof HARNESSES)[number]["key"];

function cell(f: Obj): { colour: string; hatch: boolean; text: string } {
  if (f.outcome === "sandboxed")
    return { colour: OKABE_ITO.vermillion, hatch: true, text: "sandbox" };
  if (f.outcome === "denied" || f.outcome === "blocked")
    return { colour: OKABE_ITO.vermillion, hatch: true, text: "refused" };
  if (f.decision === "ask")
    return { colour: OKABE_ITO.purple, hatch: false, text: "asked" };
  return { colour: OKABE_ITO.green, hatch: false, text: "ran" };
}

/** A short column label for a call. */
function short(f: Obj): string {
  const s = f.subject as string;
  if (f.name === "run_shell") {
    if (s.startsWith("rm ")) return s.includes("~") ? "rm ~" : "rm build";
    if (s.startsWith("pip")) return "pip";
    if (s.startsWith("git")) return "git";
    return s.split(" ")[0]!;
  }
  return (f.name as string).replace("_file", "").replace("list_files", "ls");
}

export default function HarnessesWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("harnesses");
  const [focus, setFocus] = useState<Key>("claude-code");
  const [hover, setHover] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      engine.status === "ready"
        ? HARNESSES.map((h) => {
            const ev = engine.runs[h.key]!;
            return { ...h, ev, frames: permissionFrames(ev) };
          })
        : [],
    [engine],
  );
  const n = rows.length ? rows[0]!.frames.length : 0;
  const st = useStepper(n, { stepMs: 1300, resetKey: focus });
  if (engine.status !== "ready" || n === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const i = st.step;
  const fr = rows.find((r) => r.key === focus)!.frames[i]!;
  const hl = fr.decision === "ask" ? "wait" : "model";

  const visual = (
    <div className="grid min-w-0 gap-2">
      <div
        className="relative overflow-x-auto"
        tabIndex={0}
        aria-label="Each harness imitation, call by call"
      >
        <table className="w-full min-w-80 border-separate border-spacing-0.5 text-[0.68rem]">
          <thead>
            <tr className="text-neutral-600 dark:text-neutral-400">
              <th className="text-left font-medium">Imitating</th>
              {rows[0]!.frames.map((f, k) => (
                <th
                  key={k}
                  scope="col"
                  className={`px-0.5 text-center font-mono ${k === i ? "font-bold text-accent underline dark:text-indigo-300" : "font-normal"}`}
                >
                  {short(f)}
                </th>
              ))}
              <th className="text-right font-medium">time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const f = r.frames[i]!;
              return (
                <tr
                  key={r.key}
                  data-harness={r.key}
                  style={{ opacity: hover && r.key !== focus ? 0.55 : 1 }}
                >
                  <th
                    scope="row"
                    className={`whitespace-nowrap pr-1 text-left ${r.key === focus ? "font-semibold text-neutral-950 dark:text-white" : "font-normal text-neutral-700 dark:text-neutral-300"}`}
                  >
                    {r.label}
                  </th>
                  {r.frames.map((x, k) => {
                    const c = cell(x);
                    return (
                      <td
                        key={k}
                        title={`${r.label}: ${c.text}`}
                        className="h-5 min-w-5 rounded-sm"
                        style={{
                          backgroundColor: k <= i ? c.colour : "#d4d4d4",
                          backgroundImage:
                            k <= i && c.hatch ? HATCH_CSS : undefined,
                          outline:
                            k === i && r.key === focus
                              ? `2px solid ${STATE_COLOUR.active}`
                              : undefined,
                        }}
                      >
                        <span className="sr-only">
                          {k <= i ? c.text : "not yet"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap pl-1 text-right font-mono text-neutral-800 dark:text-neutral-200">
                    {fmtMs(f.done as number)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 rounded bg-white px-2 py-1 text-[0.7rem] text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
        {[
          ["ran", OKABE_ITO.green, false],
          ["asked the human (approved)", OKABE_ITO.purple, false],
          ["stopped by the sandbox", OKABE_ITO.vermillion, true],
        ].map(([t, c, h]) => (
          <li key={t as string} className="flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{
                backgroundColor: c as string,
                backgroundImage: h ? HATCH_CSS : undefined,
              }}
            />
            {t as string}
          </li>
        ))}
      </ul>
      <p className="text-[0.7rem] font-medium text-neutral-700 dark:text-neutral-300">
        A policy imitation, not the product: the same scripted model and the
        same steps under each harness&apos;s documented defaults.
      </p>
    </div>
  );

  const stats = (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      aria-label="Totals for each harness imitation"
    >
      <table className="w-full min-w-80 text-left text-[0.72rem]">
        <caption className="text-left text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          Whole run, same model price (Claude Sonnet 4.6 list price,
          illustrative)
        </caption>
        <thead>
          <tr className="text-neutral-600 dark:text-neutral-400">
            <th className="py-1 pr-2 font-medium">Imitating</th>
            <th className="py-1 pr-2 font-medium">Time</th>
            <th className="py-1 pr-2 font-medium">Questions</th>
            <th className="py-1 pr-2 font-medium">Stopped</th>
            <th className="py-1 pr-2 font-medium">Tokens</th>
            <th className="py-1 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => {
            const end = r.ev[r.ev.length - 1]!;
            const t = end.totals as Obj;
            const stopped = r.frames.filter(
              (x) => x.outcome !== "ok" && x.outcome !== "error",
            ).length;
            return (
              <tr
                key={r.key}
                className={
                  r.key === focus
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : "text-neutral-700 dark:text-neutral-300"
                }
              >
                <td className="py-0.5 pr-2 font-sans">{r.label}</td>
                <td className="py-0.5 pr-2">{fmtMs(end.elapsed as number)}</td>
                <td className="py-0.5 pr-2">{t.human_prompts}</td>
                <td className="py-0.5 pr-2">{stopped}</td>
                <td className="py-0.5 pr-2">
                  {fmtInt(t.input_tokens + t.output_tokens)}
                </td>
                <td className="py-0.5">{fmtUsd(t.cost)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <AnimationPanel
      testId="harnesses-widget"
      title="One task, six policy imitations"
      summary="Fix the failing test, then pip install, rm -rf build, rm -rf ~/.cache/pytest and git status. The simulated human takes 3–9 s per question and approves everything."
      stepper={st}
      stepLabel="call"
      caption={harnessCaption(
        rows.map((r) => ({ label: r.label, f: r.frames[i]! })),
        i,
      )}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? hl}
      onEquationHover={setHover}
      params={
        <Segmented
          label="Highlight"
          value={focus}
          options={HARNESSES.map((h) => ({ value: h.key, label: h.label }))}
          onChange={setFocus}
        />
      }
    />
  );
}
