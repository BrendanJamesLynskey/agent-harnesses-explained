/**
 * The context window as a stacked bar: one segment per kind of content (system prompt, tool
 * definitions, task, the model's messages, tool results …), widths to scale against
 * `max` tokens. Kinds the harness injects (error feedback, nudges, summaries) are hatched
 * as well as coloured. HTML, so labels stay readable at any width.
 */
import type { Part } from "@/lib/engine/vendor/index";
import { fmtInt } from "@/lib/format";
import { HATCHED_KINDS, KIND_COLOUR, KIND_NAME } from "@/lib/viz/palette";

export const HATCH_CSS =
  "repeating-linear-gradient(45deg, rgb(0 0 0 / 0.35) 0 2px, transparent 2px 6px)";

export function ContextBar({
  parts,
  max,
  grow,
  height = 28,
  label,
  marks = [],
  focus,
}: {
  parts: Part[];
  max: number;
  /** A kind whose segment is still filling, and how far (0..1) of its last `of` tokens. */
  grow?: { kind: string; of: number; frac: number };
  height?: number;
  label: string;
  /** Vertical lines at token positions (e.g. the window, the compaction trigger). */
  marks?: { at: number; label: string; colour: string; dashed?: boolean }[];
  /** Kinds to emphasise (the equation term under the pointer); the rest are dimmed. */
  focus?: string[];
}): JSX.Element {
  const total = parts.reduce((s, p) => s + p.tokens, 0);
  return (
    <div className="min-w-0">
      <div
        role="img"
        aria-label={`${label}: ${fmtInt(total)} tokens: ${parts.map((p) => `${KIND_NAME[p.kind] ?? p.kind} ${fmtInt(p.tokens)}`).join(", ")}`}
        className="relative w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800"
        style={{ height }}
      >
        <div className="flex h-full">
          {parts.map((p) => {
            let n = p.tokens;
            if (grow && grow.kind === p.kind)
              n = p.tokens - grow.of * (1 - grow.frac);
            return (
              <div
                key={p.kind}
                data-kind={p.kind}
                className="h-full shrink-0 border-r border-white/60 last:border-r-0 dark:border-neutral-900/60"
                style={{
                  width: `${(100 * Math.max(0, n)) / max}%`,
                  backgroundColor: KIND_COLOUR[p.kind],
                  backgroundImage: HATCHED_KINDS.has(p.kind)
                    ? HATCH_CSS
                    : undefined,
                  opacity: focus && !focus.includes(p.kind) ? 0.3 : 1,
                }}
              />
            );
          })}
        </div>
        {marks.map((m) => (
          <div
            key={m.label}
            aria-hidden
            className="absolute inset-y-0 w-0 border-l-2"
            style={{
              left: `${(100 * m.at) / max}%`,
              borderColor: m.colour,
              borderStyle: m.dashed ? "dashed" : "solid",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** The colour key for the kinds present. */
export function KindLegend({ kinds }: { kinds: string[] }): JSX.Element {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
      {kinds.map((k) => (
        <li key={k} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block size-3 rounded-sm"
            style={{
              backgroundColor: KIND_COLOUR[k],
              backgroundImage: HATCHED_KINDS.has(k) ? HATCH_CSS : undefined,
            }}
          />
          {KIND_NAME[k] ?? k}
        </li>
      ))}
    </ul>
  );
}
