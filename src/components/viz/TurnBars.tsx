/**
 * The home page's picture: the context sent on each turn of the scripted fix-the-test run,
 * one bar per model call, to scale, computed by the engine at build time. Server Component.
 */
import { ContextBar, KindLegend } from "@/components/agent/ContextBar";
import { serverRuns } from "@/lib/agent/values";
import { agg, type Obj } from "@/lib/engine";
import { fmtInt } from "@/lib/format";

export function TurnBars(): JSX.Element {
  const ev = serverRuns("loop").scripted!;
  const calls = ev.filter(
    (e) => e.type === "model_call" && e.purpose === "act",
  );
  const max = Math.max(...calls.map((c) => c.input_tokens as number));
  const kinds = [
    ...new Set(
      calls.flatMap((c) => agg(c.context as Obj[]).map((p) => p.kind)),
    ),
  ];
  return (
    <div>
      <ol className="space-y-1.5">
        {calls.map((c) => (
          <li key={c.turn as number} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-mono text-[0.7rem] text-neutral-600 dark:text-neutral-400">
              turn {c.turn as number}
            </span>
            <div className="min-w-0 flex-1" style={{ width: "100%" }}>
              <div
                style={{
                  width: `${(100 * (c.input_tokens as number)) / max}%`,
                }}
              >
                <ContextBar
                  parts={agg(c.context as Obj[])}
                  max={c.input_tokens as number}
                  height={14}
                  label={`Turn ${c.turn as number}`}
                />
              </div>
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[0.7rem] text-neutral-600 dark:text-neutral-400">
              {fmtInt(c.input_tokens as number)}
            </span>
          </li>
        ))}
      </ol>
      <KindLegend kinds={kinds} />
    </div>
  );
}
