/**
 * This site's favicon glyph (src/app/icon.svg) and its card's graphic.
 * Glyph: the bubble of the Agents track, the letter H, #dc2626.
 */
import { serverRuns } from "@/lib/agent/values";
import { agg, type Obj } from "@/lib/engine";
import { KIND_COLOUR } from "@/lib/viz/palette";

export function Glyph({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="0.5" y="1" width="31" height="24" rx="6" fill="#dc2626" />
      <path d="M6 23v8.5l8.5-8.5z" fill="#dc2626" />
      <path
        d="M21.74 20H18.77V13.96H13.23V20H10.26V6H13.23V11.49H18.77V6H21.74Z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * The landing hero's bars: the context sent on each model call of the scripted fix-the-test run,
 * to scale and coloured by kind, from the engine at build time.
 */
export function Motif(): JSX.Element {
  const calls = serverRuns("loop").scripted!.filter(
    (e) => e.type === "model_call" && e.purpose === "act",
  );
  const max = Math.max(...calls.map((c) => c.input_tokens as number));
  const W = 420;
  const gap = 10;
  const h = Math.min(44, (400 - gap * (calls.length - 1)) / calls.length);
  return (
    <svg width="440" height="420" viewBox="0 0 440 420">
      {calls.map((c, i) => {
        const parts = agg(c.context as Obj[]);
        const y = 210 - ((h + gap) * calls.length - gap) / 2 + i * (h + gap);
        let x = 10;
        return parts.map((p, j) => {
          const w = (W * p.tokens) / max;
          const r = (
            <rect
              key={`${i}-${j}`}
              x={x}
              y={y}
              width={Math.max(w - 1, 0.5)}
              height={h}
              rx={3}
              fill={KIND_COLOUR[p.kind] ?? "#64748b"}
            />
          );
          x += w;
          return r;
        });
      })}
    </svg>
  );
}
