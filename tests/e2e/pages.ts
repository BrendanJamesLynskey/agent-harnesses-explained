/** The pages and animations every e2e spec walks. */
export const PAGES = [
  "/",
  "/learn",
  "/traces",
  "/about",
  "/learn/01-the-agent-loop",
  "/learn/02-tool-calling",
  "/learn/03-the-context-budget",
  "/learn/04-prompt-caching",
  "/learn/05-permissions",
] as const;

export const ANIMATIONS = [
  ["/learn/01-the-agent-loop", "loop-widget"],
  ["/learn/02-tool-calling", "toolcall-widget"],
  ["/learn/03-the-context-budget", "budget-widget"],
  ["/learn/04-prompt-caching", "cache-widget"],
  ["/learn/05-permissions", "permission-widget"],
] as const;

/** The engine runs in a worker after the page loads: allow for a slow runner. */
export const ENGINE_TIMEOUT = 30_000;
