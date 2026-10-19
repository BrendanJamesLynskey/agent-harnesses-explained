/**
 * <V of="cache.stable-claude-sonnet-4.6.saving" fmt="pct" />: a number from the engine,
 * formatted, in running prose. <V v="…" />: one of the
 * learning layer's model values (src/lib/learn/values.ts), the same way.
 * Server Component.
 */
import { formatValue, lookup, type Fmt } from "@/lib/agent/values";
import { learnValue } from "@/lib/learn/values";

export function V({
  of,
  v,
  fmt = "num",
}: {
  of?: string;
  v?: string;
  fmt?: Fmt;
}): JSX.Element {
  if (of !== undefined)
    return <span data-v={of}>{formatValue(lookup(of), fmt)}</span>;
  if (v === undefined) throw new Error("<V> needs `of` or `v`");
  return <span data-learn-value={v}>{formatValue(learnValue(v), fmt)}</span>;
}
