/**
 * A run's timeline in lanes (the engine's `timeline` spans): one row per lane, each span to
 * scale against the run's length, a marker at the animation's current time. Spans after the
 * marker are faded. HTML, so the labels stay readable on a phone. Chapters 6, 8 and 10 use
 * it; chapter 5 draws its own (the same look).
 */
import type { Obj } from "@/lib/engine/vendor/index";
import { fmtMs } from "@/lib/format";
import { HATCH_CSS } from "@/components/agent/ContextBar";
import { STATE_COLOUR } from "@/lib/viz/palette";

export type Lane = {
  key: string;
  label: string;
  colour: string;
  /** Which spans belong in this lane. */
  match: (s: Obj) => boolean;
  /** Draw the lane's spans hatched (waits, back-offs). */
  hatched?: boolean;
};

export function Timeline({
  spans,
  lanes,
  total,
  now,
  dim,
  label,
}: {
  spans: Obj[];
  lanes: Lane[];
  /** The run's length (ms): the full width. */
  total: number;
  /** The animation's current time (ms). */
  now: number;
  /** Lanes to fade (the equation term under the pointer is elsewhere). */
  dim?: (lane: string) => boolean;
  label: string;
}): JSX.Element {
  const T = Math.max(total, 1);
  return (
    <div role="img" aria-label={`${label}, ${fmtMs(total)} in all.`}>
      {lanes.map((lane) => (
        <div key={lane.key} className="flex items-center gap-2 py-0.5">
          <span className="w-20 shrink-0 truncate text-[0.72rem] text-neutral-700 dark:text-neutral-300">
            {lane.label}
          </span>
          <div
            className="relative h-4 min-w-0 flex-1 rounded-sm bg-neutral-100 dark:bg-neutral-900"
            data-lane={lane.key}
            style={{ opacity: dim?.(lane.key) ? 0.3 : 1 }}
          >
            {spans.filter(lane.match).map((s, k) => (
              <span
                key={k}
                className="absolute inset-y-0"
                style={{
                  left: `${(100 * (s.start as number)) / T}%`,
                  width: `max(2px, ${(100 * ((s.end as number) - (s.start as number))) / T}%)`,
                  backgroundColor: lane.colour,
                  backgroundImage: lane.hatched ? HATCH_CSS : undefined,
                  opacity: (s.start as number) <= now ? 1 : 0.25,
                }}
              />
            ))}
            <span
              aria-hidden
              className="absolute -inset-y-1 w-0.5"
              style={{
                left: `${(100 * Math.min(now, T)) / T}%`,
                backgroundColor: STATE_COLOUR.active,
              }}
            />
          </div>
        </div>
      ))}
      <p className="text-right text-[0.7rem] text-neutral-600 dark:text-neutral-400">
        {fmtMs(total)} in all
      </p>
    </div>
  );
}
