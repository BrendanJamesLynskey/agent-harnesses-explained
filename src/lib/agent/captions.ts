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
