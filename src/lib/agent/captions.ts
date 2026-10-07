/**
 * The live caption under each animation, built from the frame the animation is on (the
 * engine's views). Pure functions of the frame, so the frame tests can check that the page
 * shows the caption built from the Python reference's frame.
 */
import type { Obj } from "@/lib/engine/vendor/index";
import { clip, fmtInt, fmtMs, fmtUsd, pct } from "@/lib/format";

const call = (name: string, subject: string) =>
  subject ? `${name}(${clip(subject, 36)})` : `${name}()`;

export function loopCaption(f: Obj): string {
  switch (f.phase) {
    case "call":
      return `Turn ${f.turn}: the harness sends the whole context, ${fmtInt(f.input)} tokens, to the model${f.cached > 0 ? ` (${fmtInt(f.cached)} of them already in the prompt cache)` : ""}.`;
    case "output":
      return `Turn ${f.turn}: the model writes ${fmtInt(f.output)} tokens, and they join the context (now ${fmtInt(f.total)}).`;
    case "tool":
      return `The harness parses a tool call and runs ${call(f.name, f.subject)}.`;
    case "result":
      return `${f.name} ${f.ok ? "returns" : "fails, and returns its error as"} ${fmtInt(f.tokens)} tokens; the context is now ${fmtInt(f.total)}.`;
    case "compact":
      return `Compaction: the context shrinks from ${fmtInt(f.before)} to ${fmtInt(f.after)} tokens.`;
    case "error":
      return f.kind === "malformed"
        ? `Turn ${f.turn}: the call is malformed (${f.detail}); the harness sends the error back.`
        : `Turn ${f.turn}: ${f.detail}.`;
    case "done":
      return `The run ends (${f.status === "done" ? "the model answered without a tool call" : f.status}): ${fmtInt(f.total)} tokens in context, ${fmtUsd(f.cost)} spent.`;
    default:
      return "";
  }
}

export function toolcallCaption(f: Obj): string {
  switch (f.phase) {
    case "emit":
      return `Turn ${f.turn}: the model writes ${fmtInt(f.tokens)} tokens of text.`;
    case "parse":
      return `The harness finds a call: ${f.name} with ${clip(JSON.stringify(f.args), 44)}.`;
    case "malformed":
      return `The harness can't parse it: ${f.detail}. It sends that back as a ${fmtInt(f.tokens)}-token error.`;
    case "result":
      return `${f.name} ${f.ok ? "returns" : "fails"}: ${clip((f.text as string).split("\n")[0] ?? "", 52)}`;
    case "final":
      return `No tool call: the harness takes the text as the final answer (${f.status}).`;
    default:
      return "";
  }
}

export function budgetCaption(f: Obj): string {
  if (f.phase === "call")
    return `Turn ${f.turn}: ${fmtInt(f.total)} of ${fmtInt(f.window)} tokens (${pct(f.total / f.window)}) with ${fmtInt(f.reserve)} kept free for the answer; compaction fires above ${fmtInt(f.trigger)}.`;
  if (f.phase === "compact")
    return `${f.strategy === "summarise" ? "Summarising" : f.strategy === "clip" ? "Clipping" : "Truncating"}: ${fmtInt(f.before)} → ${fmtInt(f.after)} tokens; ${(f.lost as string[]).length ? `facts lost: ${(f.lost as string[]).join(", ")}` : "no fact lost"}.`;
  if (f.phase === "overflow")
    return `Turn ${f.turn}: the prompt no longer fits the ${fmtInt(f.window)}-token window, and the run stops.`;
  return "";
}

export function cacheCaption(f: Obj, i: number): string {
  return `Call ${i + 1}: ${fmtInt(f.cached)} of ${fmtInt(f.input)} prompt tokens read from the cache (${pct(f.hit)}); spent so far ${fmtUsd(f.cum)}, against ${fmtUsd(f.cum_plain)} without caching.`;
}

export function permissionCaption(f: Obj): string {
  const what = call(f.name, f.subject);
  const asked =
    f.decision === "ask"
      ? `; the human ${f.answer === "approve" ? "approves" : "refuses"} after ${fmtMs(f.wait)}`
      : "";
  const outcome =
    f.outcome === "denied"
      ? "it is not run"
      : f.outcome === "blocked"
        ? "a hook blocks it"
        : f.outcome === "ok"
          ? "it runs"
          : "it runs but fails";
  return `${what}: ${f.decision} (${f.reason})${asked}, so ${outcome}.`;
}

/** "main" is the parent; "sub1", "sub2" … are sub-agents. */
export function agentName(a: string): string {
  return a === "main" ? "Parent" : `Sub-agent ${a.replace(/^sub/, "")}`;
}

export function agentsCaption(f: Obj): string {
  const who = agentName((f.agent as string | undefined) ?? "main");
  const ctx = (a: string) => fmtInt((f.totals as Obj)[a] ?? 0);
  switch (f.phase) {
    case "call":
      return `${who}, turn ${f.turn}: sends its context, ${fmtInt(f.input)} tokens, to the model.`;
    case "output":
      return `${who}, turn ${f.turn}: the model writes ${fmtInt(f.output)} tokens.`;
    case "tool":
      return `${who} runs ${call(f.name, f.subject)}.`;
    case "result":
      return `${f.name} returns ${fmtInt(f.tokens)} tokens into the ${f.agent === "main" ? "parent's" : "sub-agent's"} context (now ${ctx(f.agent)}).`;
    case "spawn":
      return `The parent hands the sub-task to ${agentName(f.child).toLowerCase()}, which starts with a fresh context: the ${fmtInt(f.prompt_tokens)}-token prompt and nothing else.`;
    case "return":
      return `${agentName(f.child)} is done after ${fmtInt(f.child_tokens)} tokens of its own work; only its ${fmtInt(f.summary_tokens)}-token report enters the parent's context.`;
    case "compact":
      return `${who} compacts its context: ${fmtInt(f.before)} → ${fmtInt(f.after)} tokens.`;
    case "error":
      return `${who}, turn ${f.turn}: ${f.detail}.`;
    case "done":
      return `The run ends (${f.status}) with ${ctx("main")} tokens in the parent's context${"sub1" in (f.totals as Obj) ? ` and ${ctx("sub1")} left behind in the sub-agent's` : ""}.`;
    default:
      return "";
  }
}

const OUTCOME: Record<string, string> = {
  ok: "it runs",
  error: "it runs and fails",
  transient: "it fails transiently",
  denied: "a rule refuses it",
  blocked: "a hook blocks it",
  sandboxed: "the sandbox stops it",
};

export function pipelineCaption(f: Obj): string {
  const what = call(f.name ?? "run_shell", f.subject);
  switch (f.stage) {
    case "call":
      return `The model asks for ${what}.`;
    case "permission":
      return `Permissions: ${f.decision} (${f.reason})${f.decision === "ask" ? `; the human ${f.answer === "approve" ? "approves" : "refuses"} after ${fmtMs(f.wait)}` : ""}.`;
    case "hook":
      return f.action === "block"
        ? `Pre-tool hook ${f.hook} blocks the call.`
        : f.action === "rewrite"
          ? `Pre-tool hook ${f.hook} rewrites the command to "${clip(f.subject, 30)}".`
          : `Post-tool hook ${f.hook} appends its note to the result.`;
    case "result":
      return `${what}: ${OUTCOME[f.kind] ?? f.kind}${f.kind === "sandboxed" ? ` (${clip((f.text as string).split("\n")[1] ?? "", 48)})` : ""}.`;
    default:
      return "";
  }
}

/** Chapter 8's frames: the events a recovery animation steps through. */
export const RECOVERY_TYPES = new Set([
  "model_call",
  "tool_call",
  "retry",
  "tool_result",
  "error",
  "run_end",
]);

export function recoveryCaption(e: Obj): string {
  switch (e.type) {
    case "model_call":
      return `Turn ${e.turn}: the model is called (${fmtMs(e.dur)}).`;
    case "tool_call":
      return `The harness runs ${call(e.name, e.subject)}.`;
    case "retry":
      return `Attempt ${e.attempt} failed (${e.error}); the harness waits ${fmtMs(e.backoff)} and tries again.`;
    case "tool_result":
      return e.ok
        ? `${e.name} succeeds after ${fmtMs(e.dur)}.`
        : `${e.name} fails: ${clip(e.text as string, 52)}; the error goes back to the model.`;
    case "error":
      return e.kind === "loop"
        ? `Loop detection: ${clip(e.detail as string, 60)}${e.message_tokens > 0 ? "; the harness nudges the model" : "; the harness stops the run"}.`
        : `Turn ${e.turn}: ${e.detail}.`;
    case "run_end":
      return `The run ends: ${e.status === "done" ? "the model reports success" : e.status === "loop" ? "stopped by loop detection" : e.status}, after ${fmtMs(e.elapsed)}.`;
    default:
      return "";
  }
}

const DECISION_WORD: Record<string, string> = {
  allow: "runs it",
  deny: "refuses it",
};

/** Chapter 9: one call across every harness imitation. */
export function harnessCaption(
  rows: { label: string; f: Obj }[],
  i: number,
): string {
  const first = rows[0]!.f;
  const parts = rows.map(({ label, f }) => {
    const how =
      f.outcome === "sandboxed"
        ? "its sandbox stops it"
        : f.outcome === "blocked"
          ? "a hook blocks it"
          : f.decision === "ask"
            ? `asks (${fmtMs(f.wait)})`
            : (DECISION_WORD[f.decision as string] ?? (f.decision as string));
    return `${label} ${how}`;
  });
  return `Call ${i + 1}, ${call(first.name, first.subject)}: ${parts.join("; ")}.`;
}

export function costCaption(f: Obj, i: number, dur: number): string {
  return `Call ${i + 1}: ${fmtInt(f.uncached)} new and ${fmtInt(f.cached)} cached prompt tokens, ${fmtInt(f.output)} output tokens; ${fmtUsd(f.cost)} and ${fmtMs(dur)}. Running total ${fmtUsd(f.cum)}.`;
}
