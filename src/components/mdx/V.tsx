/**
 * <V of="cache.stable-claude-sonnet-4.6.saving" fmt="pct" />: a number from the engine's runs,
 * formatted, in running prose. Server Component.
 */
import { formatValue, lookup, type Fmt } from "@/lib/agent/values";

export function V({ of, fmt = "num" }: { of: string; fmt?: Fmt }): JSX.Element {
  return <span data-v={of}>{formatValue(lookup(of), fmt)}</span>;
}
