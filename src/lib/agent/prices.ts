/**
 * The price switch shared by chapters 4, 6, 9 and 10: the same run priced on two generations
 * of models. "Earlier" is the set the chapters were first written on (Claude Sonnet 4.6 and
 * Haiku 4.5, GPT-5 mini); "current" is the set on the providers' pages on the date in each
 * price's `accessed` field (Claude Sonnet 5.5 and Haiku 5.5, GPT-6.1 Sol). Every price, cache
 * minimum and read multiplier comes from the engine's table (`accounting.PRICES`); this file
 * only says which entry each switch position means.
 */
export const GENERATIONS = [
  { value: "earlier", label: "earlier (4.x, GPT-5)" },
  { value: "current", label: "current (5.x, GPT-6)" },
] as const;
export type Generation = (typeof GENERATIONS)[number]["value"];

export const TIERS = ["mid", "small", "openai"] as const;
export type Tier = (typeof TIERS)[number];

export const PRICE_OF: Record<Generation, Record<Tier, string>> = {
  earlier: {
    mid: "claude-sonnet-4.6",
    small: "claude-haiku-4.5",
    openai: "gpt-5-mini",
  },
  current: {
    mid: "claude-sonnet-5.5",
    small: "claude-haiku-5.5",
    openai: "gpt-6.1-sol",
  },
};

const SHORT: Record<string, string> = {
  "claude-sonnet-4.6": "Sonnet 4.6",
  "claude-haiku-4.5": "Haiku 4.5",
  "gpt-5-mini": "GPT-5 mini",
  "claude-sonnet-5.5": "Sonnet 5.5",
  "claude-haiku-5.5": "Haiku 5.5",
  "gpt-6.1-sol": "GPT-6.1 Sol",
  "claude-opus-5.5": "Opus 5.5",
  "claude-fable-5.1": "Fable 5.1",
  "gpt-6-luna": "GPT-6 Luna",
  "gpt-6-astra": "GPT-6 Astra",
  "gpt-oss-120b": "gpt-oss-120b",
  local: "local",
};

/** A short name for a price key ("Sonnet 5.5"). */
export function shortName(key: string): string {
  return SHORT[key] ?? key;
}

/** The tier options of one generation, labelled with that generation's model names. */
export function tierOptions(g: Generation): { value: Tier; label: string }[] {
  return TIERS.map((t) => ({ value: t, label: shortName(PRICE_OF[g][t]) }));
}

/** Thinking budgets offered by chapter 10's calculator (reasoning tokens per acting call). */
export const THINKING = [
  { value: "0", label: "off" },
  { value: "1000", label: "1,000 / call" },
  { value: "4000", label: "4,000 / call" },
] as const;
export type Thinking = (typeof THINKING)[number]["value"];
