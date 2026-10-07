/**
 * The family's visual language (explained_sites_visual_standard.md §3): Okabe and Ito's
 * colour-blind-safe palette, the same in light and dark mode. On the agent sites:
 *
 * - one colour per part of the context window (system prompt, tool definitions, the task,
 *   the model's own messages, tool results, summaries), used on every chapter;
 * - one colour per timeline lane: the model, the tools, the human;
 * - "active" is a highlight, "done" is muted, and errors, denials and waits use the warning
 *   hue plus a hatch pattern, never colour alone.
 *
 * Okabe, M. and Ito, K. (2008), "Color Universal Design (CUD): how to make figures and
 * presentations that are friendly to colorblind people", https://jfly.uni-koeln.de/color/
 */

export const OKABE_ITO = {
  black: "#000000",
  orange: "#E69F00",
  sky: "#56B4E9",
  green: "#009E73",
  yellow: "#F0E442",
  blue: "#0072B2",
  vermillion: "#D55E00",
  purple: "#CC79A7",
} as const;

/** One colour per kind of context content (the engine's KIND_ORDER). */
export const KIND_COLOUR: Record<string, string> = {
  system: OKABE_ITO.blue,
  tools: OKABE_ITO.sky,
  task: OKABE_ITO.yellow,
  summary: "#8c8c8c",
  assistant: OKABE_ITO.orange,
  tool_result: OKABE_ITO.green,
  observation: OKABE_ITO.green,
  error: OKABE_ITO.vermillion,
  nudge: OKABE_ITO.vermillion,
  prompt: "#525252",
};

export const KIND_NAME: Record<string, string> = {
  system: "System prompt",
  tools: "Tool definitions",
  task: "Task",
  summary: "Summary",
  assistant: "Model's messages",
  tool_result: "Tool results",
  observation: "Observations",
  error: "Error feedback",
  nudge: "Nudge",
  prompt: "Reply header",
};

/** Kinds drawn with a hatch on top of their colour (feedback the harness injected). */
export const HATCHED_KINDS = new Set(["error", "nudge", "summary"]);

/** Timeline lanes. */
export const LANE_COLOUR: Record<string, string> = {
  model: OKABE_ITO.orange,
  tool: OKABE_ITO.green,
  human: OKABE_ITO.purple,
  retry: OKABE_ITO.vermillion,
};

export const STATE_COLOUR = {
  active: OKABE_ITO.blue,
  stalled: OKABE_ITO.vermillion,
  ok: OKABE_ITO.green,
} as const;

/** Muted ("done", "idle") greys: Tailwind neutral-400 and neutral-600. */
export const MUTED = { light: "#a3a3a3", dark: "#525252" } as const;
