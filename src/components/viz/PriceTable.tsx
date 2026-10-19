/**
 * Chapter 4's price table: every model in the engine's dated price table
 * (`accounting.PRICES`, vendored), grouped by generation, with the three numbers the cache
 * maths needs: the write multiplier w, the read multiplier rho and the minimum cacheable
 * prompt. Server Component; it scrolls sideways inside its own focusable box on a phone.
 */
import { PRICES, type Obj } from "@/lib/engine/vendor/index";
import { fmtInt, trim } from "@/lib/format";

const ORDER = ["Claude 5.x", "GPT-6", "open weights", "Claude 4.x", "GPT-5"];

/** A price per million tokens: whole dollars as they are ($4), whole cents to the cent ($0.20), finer as they are ($0.025). */
function usd(v: number): string {
  if (Number.isInteger(v)) return `$${v}`;
  return Number.isInteger(Math.round(v * 1e6) / 1e4)
    ? `$${v.toFixed(2)}`
    : `$${trim(v)}`;
}

export function PriceTable(): JSX.Element {
  const rows = Object.entries(PRICES as Record<string, Obj>)
    .filter(([k]) => k !== "local")
    .sort(
      ([, a], [, b]) =>
        ORDER.indexOf(a.generation as string) -
        ORDER.indexOf(b.generation as string),
    );
  const accessed = [...new Set(rows.map(([, p]) => p.accessed as string))];
  return (
    <figure data-testid="price-table" className="my-6 min-w-0">
      <figcaption className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        The engine&apos;s price table (US dollars per million tokens; list
        prices accessed {accessed.join(", ")})
      </figcaption>
      <div
        className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800"
        tabIndex={0}
        aria-label="The price table (scrolls sideways)"
      >
        <table className="w-full min-w-[40rem] border-collapse text-left text-[0.74rem] leading-snug">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr className="text-neutral-700 dark:text-neutral-300">
              <th className="p-2 font-medium">Model</th>
              <th className="p-2 font-medium">Generation</th>
              <th className="p-2 text-right font-medium">Input</th>
              <th className="p-2 text-right font-medium">Output</th>
              <th className="p-2 text-right font-medium">Cache read</th>
              <th className="p-2 text-right font-medium">ρ (read ÷ input)</th>
              <th className="p-2 text-right font-medium">w (write ÷ input)</th>
              <th className="p-2 text-right font-medium">Minimum</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map(([k, p]) => (
              <tr
                key={k}
                data-price={k}
                className="border-t border-neutral-200 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
              >
                <td className="p-2 font-sans">
                  <a
                    href={p.source as string}
                    className="focus-ring rounded text-accent underline dark:text-indigo-300"
                  >
                    {p.label as string}
                  </a>
                </td>
                <td className="p-2 font-sans">{p.generation as string}</td>
                <td className="p-2 text-right">{usd(p.input as number)}</td>
                <td className="p-2 text-right">{usd(p.output as number)}</td>
                <td className="p-2 text-right">
                  {p.cache_listed ? usd(p.cache_read as number) : "—"}
                </td>
                <td className="p-2 text-right">
                  {p.cache_listed ? trim(p.read_multiplier as number) : "—"}
                </td>
                <td className="p-2 text-right">
                  {p.cache_listed
                    ? trim((p.cache_write as number) / (p.input as number))
                    : "—"}
                </td>
                <td className="p-2 text-right">
                  {p.cache_listed
                    ? `${fmtInt(p.min_tokens as number)}${(p.block as number) > 1 ? ` (×${p.block})` : ""}`
                    : "no cache listed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
        Claude prices are the 5-minute cache write; Haiku 5.5 is the rate for
        prompts up to 100,000 tokens; OpenAI prices are the standard tier, short
        context. Claude&apos;s pricing page notes that Claude 4.7 and later
        models use a tokenizer that gives about 30% more tokens for the same
        text, and every count on this site is Qwen2.5&apos;s, so compare the
        rates, not the bills. &quot;(×128)&quot;: cached tokens are counted in
        128-token blocks.
      </p>
    </figure>
  );
}
