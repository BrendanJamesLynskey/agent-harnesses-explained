/**
 * The Agents track's start page (/agents, brief 44): the six sites in
 * reading order (the same list as the landing pages' reading order) and a
 * glossary whose terms link to the chapter section that defines each one, on
 * whichever of the six sites defines it. tests/unit/agents.test.ts checks
 * that every link to this site names a chapter and an anchor that exist; the
 * other sites' anchors are added by their own learning layers and checked by
 * their own tests.
 */
import { AGENT_TRACK } from "@/components/ui/ReadingOrder";
import type { TrackSite } from "@/components/learn/ReadingOrder";

export const HARNESSES = "https://agent-harnesses-explained.vercel.app";
export const PROTOCOLS = "https://agent-protocols-explained.vercel.app";
export const CONTEXT = "https://agent-context-explained.vercel.app";
export const ORCHESTRATION = "https://agent-orchestration-explained.vercel.app";
export const EVALS = "https://agent-evals-explained.vercel.app";
export const SECURITY = "https://agent-security-explained.vercel.app";
export const FOUNDATIONS =
  "https://transformer-decoder-explained.vercel.app/foundations";

/** The six sites, each linked to its chapter list. */
export const AGENT_SITES: readonly TrackSite[] = AGENT_TRACK.map((s) => ({
  ...s,
  url: `${s.url}/learn`,
}));

export type GlossaryTerm = { term: string; href: string; what: string };

const h = (p: string) => `${HARNESSES}/learn/${p}`;
const p = (x: string) => `${PROTOCOLS}/learn/${x}`;
const c = (x: string) => `${CONTEXT}/learn/${x}`;
const o = (x: string) => `${ORCHESTRATION}/learn/${x}`;
const e = (x: string) => `${EVALS}/learn/${x}`;
const s = (x: string) => `${SECURITY}/learn/${x}`;

export const AGENT_GLOSSARY: readonly GlossaryTerm[] = [
  // Harnesses
  {
    term: "Harness, agent loop",
    href: h("01-the-agent-loop#ha-loop"),
    what: "the program around a model that sends the conversation, parses the reply, runs any tool and calls the model again",
  },
  {
    term: "Tool call, malformed call",
    href: h("02-tool-calling#ha-checks"),
    what: "text in a format the harness described; valid JSON, an offered tool and arguments that fit the schema, or an error back to the model",
  },
  {
    term: "Context budget, compaction",
    href: h("03-the-context-budget#ha-strategies"),
    what: "everything shares one window; truncate, clip or summarise when the next prompt would pass a fraction of it",
  },
  {
    term: "Prompt caching (ρ, w, L_min)",
    href: h("04-prompt-caching#ha-cache-maths"),
    what: "a provider re-uses a prompt's processed prefix; reads cost ρ of the input price, writes w times it, above a minimum length",
  },
  {
    term: "Permission rules and modes",
    href: h("05-permissions#ha-rule-order"),
    what: "allow, ask or deny per tool and argument pattern, checked deny first, so an allow never overrides a deny",
  },
  {
    term: "Sub-agent",
    href: h("06-sub-agents#ha-peak"),
    what: "a second loop with a fresh context; only its final report crosses back to the parent",
  },
  {
    term: "Hooks and sandbox",
    href: h("07-hooks-and-sandboxing#ha-sandbox-cases"),
    what: "the user's code at fixed points of the loop, and an operating-system boundary around the commands the agent runs",
  },
  {
    term: "Retry budget, back-off, loop detection",
    href: h("08-failure-and-recovery#ha-retry-maths"),
    what: "with r retries a call fails with probability p to the r + 1; waits double; three identical calls are not progress",
  },
  {
    term: "Policy imitation",
    href: h("09-harnesses-compared#ha-imitation"),
    what: "the simulator's settings closest to a public harness's documented defaults, with the same scripted model in every row",
  },
  {
    term: "Cost and latency of a call",
    href: h("10-cost-and-latency#ha-cost-parts"),
    what: "fresh prompt tokens, cached ones at ρ of the price, output and thinking tokens; overhead, prefill and decode time",
  },
  // Protocols
  {
    term: "MCP: host, client, server",
    href: p("01-why-a-protocol#pr-mcp"),
    what: "one client per agent application and one server per tool turn N × M adapters into N + M",
  },
  {
    term: "JSON-RPC, handshake, stateless revision",
    href: p("02-json-rpc-and-the-life-cycle#pr-stateless"),
    what: "requests, results, errors and notifications; 2026-07-28 drops the handshake and carries an envelope on every request",
  },
  {
    term: "Version negotiation",
    href: p("02-json-rpc-and-the-life-cycle#pr-negotiation"),
    what: "the newest revision both sides speak",
  },
  {
    term: "Tools, resources, prompts",
    href: p("03-tools-resources-and-prompts#pr-primitives"),
    what: "chosen by the model, the application and the user respectively",
  },
  {
    term: "stdio, Streamable HTTP",
    href: p("04-transports#pr-stdio"),
    what: "a child process with one JSON message per line, or one HTTP POST per message answered with JSON or an SSE stream",
  },
  {
    term: "Elicitation, sampling, input_required",
    href: p("05-sampling-and-elicitation#pr-input-required"),
    what: "a server needs the user or the client's model mid-call; in 2026-07-28 the call ends and is retried with the answers",
  },
  {
    term: "PKCE",
    href: p("06-authorisation#pr-pkce"),
    what: "only a hash of the verifier leaves with the user; the verifier redeems the code",
  },
  {
    term: "Token audience",
    href: p("06-authorisation#pr-audience"),
    what: "a server accepts only tokens issued for it, and never passes them on",
  },
  {
    term: "Gateway, name collisions",
    href: p("07-gateways-and-composition#pr-collide"),
    what: "one server in front of many; prefix tool names with an alias so none is shadowed",
  },
  {
    term: "A2A task",
    href: p("08-agent-to-agent#pr-task"),
    what: "work handed to another agent, with an ID and a life cycle; results as artifacts",
  },
  {
    term: "Tool poisoning (rug pull)",
    href: p("09-protocol-security#pr-poisoning"),
    what: "a changed tool description with hidden instructions; pin a hash of the approved definition",
  },
  // Context
  {
    term: "The window as working memory",
    href: c("01-the-window-is-the-working-memory#cx-policies"),
    what: "everything the model can use is in the prompt, and every call pays for it again",
  },
  {
    term: "BM25",
    href: c("02-lexical-retrieval#cx-bm25"),
    what: "lexical scoring: rare terms weigh most, repeats saturate (k1), long chunks are discounted (b)",
  },
  {
    term: "Dense retrieval",
    href: c("03-dense-retrieval#cx-dense-recall"),
    what: "texts as vectors whose cosine reflects meaning; int8 vectors lose nothing measurable",
  },
  {
    term: "Reciprocal rank fusion, reranking",
    href: c("04-hybrid-and-reranking#cx-rrf"),
    what: "merge retrievers by rank, then let a cross-encoder reorder the top n",
  },
  {
    term: "Chunking",
    href: c("05-chunking#cx-chunk-cut"),
    what: "where documents are cut decides whether an answer sits in one chunk",
  },
  {
    term: "Packing, lost in the middle",
    href: c("06-packing-the-window#cx-position"),
    what: "which chunks go in and where; models use the start and end of a long input best",
  },
  {
    term: "Lossy compaction",
    href: c("07-compaction-and-summarisation#cx-lossy-sum"),
    what: "a fact summarised n times survives with probability (1 − ℓ)ⁿ, so the oldest go first",
  },
  {
    term: "Agent memory",
    href: c("08-agent-memory#cx-memory"),
    what: "written and read back across sessions: transcript, scratchpad, episodes or facts",
  },
  {
    term: "Long context or retrieval",
    href: c("09-long-context-or-retrieval#cx-fifty"),
    what: "the whole set in every prompt, cached, or the top k chunks",
  },
  // Orchestration
  {
    term: "Super-step, barrier",
    href: o("01-from-a-chain-to-a-graph#or-supersteps"),
    what: "every triggered node reads the same snapshot; writes are applied when the last one finishes",
  },
  {
    term: "Channel, reducer",
    href: o("02-state-channels-and-reducers#or-parallel-writes"),
    what: "the rule that merges a key's writes; without one, a key takes one write per step",
  },
  {
    term: "Checkpoint, interrupt",
    href: o("03-checkpoints-and-interrupts#or-checkpoints"),
    what: "state, next tasks and pending writes after every step; an interrupted node restarts from its first line",
  },
  {
    term: "Durable execution, idempotency key",
    href: o("04-durable-execution#or-order"),
    what: "replay against a recorded history; exactly-once effects need at-least-once execution plus idempotent effects",
  },
  {
    term: "Multi-agent patterns",
    href: o("05-multi-agent-patterns#or-patterns"),
    what: "single agent, supervisor, hierarchy, swarm, debate, map-reduce: who reads what",
  },
  {
    term: "Fan-out, Amdahl's law, token bucket",
    href: o("06-fan-out-and-map-reduce#or-limits"),
    what: "a fan-out is capped by its serial part and by the rate the endpoint admits tokens",
  },
  {
    term: "Visible and silent failures, verifier",
    href: o("07-reliability#or-two-kinds"),
    what: "retries fix errors that signal themselves; only a verifier catches a plausible wrong answer",
  },
  {
    term: "Capacity, Little's law",
    href: o("08-running-at-scale#or-capacity"),
    what: "the smallest rate any limit allows; L = λW for any stable system",
  },
  // Evals
  {
    term: "Cluster-robust error, design effect",
    href: e("01-what-an-eval-is#ev-cluster"),
    what: "count tasks, not runs, as the unit; runs on one task are alike",
  },
  {
    term: "FAIL_TO_PASS, PASS_TO_PASS",
    href: e("02-the-benchmarks#ev-patches"),
    what: "hidden tests that check the fix, and that nothing else broke",
  },
  {
    term: "pass@k, pass^k",
    href: e("03-pass-at-k-and-pass-hat-k#ev-apart"),
    what: "does some one of k tries pass, or do all k",
  },
  {
    term: "Wilson interval, coverage",
    href: e("04-uncertainty#ev-coverage"),
    what: "a 95% interval that stays near 95% coverage, unlike Wald's near 0% and 100%",
  },
  {
    term: "Paired comparison, McNemar's test",
    href: e("05-comparing-two-agents#ev-pairing"),
    what: "both agents on the same tasks; only discordant tasks carry evidence",
  },
  {
    term: "LLM judge biases, swap test, κ",
    href: e("06-graders#ev-swap"),
    what: "position, verbosity and self-preference; swapping removes only position",
  },
  {
    term: "Trajectory grading",
    href: e("07-trajectories#ev-qwen"),
    what: "the outcome, verification and no unsafe action, read from the whole trace",
  },
  {
    term: "Harness effect",
    href: e("08-the-harness#ev-spread"),
    what: "the same model's score moves with tools, call format and turn budget",
  },
  {
    term: "Contamination",
    href: e("09-contamination#ev-detect"),
    what: "tasks seen in training; n-grams, canaries and time splits each see part of it",
  },
  {
    term: "Pareto front, cost per solved task",
    href: e("10-cost-aware-evaluation#ev-front"),
    what: "configurations nothing beats on both cost and success; mean cost over success rate",
  },
  // Security
  {
    term: "Labels, trust boundaries",
    href: s("01-trust-boundaries#se-labels"),
    what: "where a value came from and how secret it is; a derived value carries the join",
  },
  {
    term: "Untrusted control, indirect prompt injection",
    href: s("02-untrusted-input#se-classic-planned"),
    what: "once a model reads untrusted text, its next decisions may be that text's",
  },
  {
    term: "Lethal trifecta",
    href: s("03-the-lethal-trifecta#se-check"),
    what: "private data, untrusted input and a way out, all held at once",
  },
  {
    term: "Least privilege",
    href: s("04-least-privilege#se-grants"),
    what: "grant each task exactly the tools, scopes and destinations its plan uses",
  },
  {
    term: "Sandbox layers, egress allow-list",
    href: s("05-sandboxing-and-egress#se-layers"),
    what: "file scope, container and network allow-list limit what a process can do",
  },
  {
    term: "Detection in depth, shared blind spot",
    href: s("06-detection-is-not-enough#se-blind"),
    what: "stacked detectors multiply their misses, down to a floor they all share",
  },
  {
    term: "Dual model, CaMeL",
    href: s("07-designs-that-make-it-structural#se-planned"),
    what: "plan from the request; untrusted data never chooses what the agent does",
  },
  {
    term: "Approval fatigue",
    href: s("08-humans-in-the-loop#se-fatigue"),
    what: "each extra prompt makes a mistaken approval likelier",
  },
  {
    term: "Security–utility frontier",
    href: s("09-the-frontier#se-attackers"),
    what: "tasks finished against risk, for fixed and adaptive attackers",
  },
];
