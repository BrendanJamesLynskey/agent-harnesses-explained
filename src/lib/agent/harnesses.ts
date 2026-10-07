/**
 * Chapter 9's harnesses and its sourced matrix. Each cell says how one public harness makes
 * one choice, from its own documentation (accessed on ACCESSED), with the page it comes
 * from; a cell marked `inferred` is our reading, not a documented statement. The engine runs
 * each harness's "imitated as" policy (src/data/chapter_configs.json, chapter "harnesses"):
 * a policy imitation, not the product.
 */

export const ACCESSED = "2026-10-07";

export const SOURCES = {
  "cc-perm": {
    title: "Claude Code: configure permissions",
    url: "https://code.claude.com/docs/en/permissions",
  },
  "cc-sandbox": {
    title: "Claude Code: the sandboxed Bash tool",
    url: "https://code.claude.com/docs/en/sandboxing",
  },
  "cc-costs": {
    title: "Claude Code: manage costs (auto-compaction)",
    url: "https://code.claude.com/docs/en/costs",
  },
  "cc-sub": {
    title: "Claude Code: subagents",
    url: "https://code.claude.com/docs/en/sub-agents",
  },
  "cc-hooks": {
    title: "Claude Code: hooks reference",
    url: "https://code.claude.com/docs/en/hooks",
  },
  "anthropic-tools": {
    title: "Anthropic: tool use",
    url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview",
  },
  "codex-approvals": {
    title: "Codex: approvals and security",
    url: "https://learn.chatgpt.com/docs/agent-approvals-security",
  },
  "codex-config": {
    title: "Codex: configuration reference",
    url: "https://learn.chatgpt.com/docs/config-file/config-reference",
  },
  "codex-sub": {
    title: "Codex: subagents",
    url: "https://learn.chatgpt.com/docs/agent-configuration/subagents",
  },
  "codex-hooks": {
    title: "Codex: hooks",
    url: "https://learn.chatgpt.com/docs/hooks",
  },
  "openai-fc": {
    title: "OpenAI: function calling",
    url: "https://developers.openai.com/api/docs/guides/function-calling",
  },
  "aider-formats": {
    title: "Aider: edit formats",
    url: "https://aider.chat/docs/more/edit-formats.html",
  },
  "aider-options": {
    title: "Aider: options reference",
    url: "https://aider.chat/docs/config/options.html",
  },
  "aider-lint": {
    title: "Aider: linting and testing",
    url: "https://aider.chat/docs/usage/lint-test.html",
  },
  "aider-map": {
    title: "Aider: repository map",
    url: "https://aider.chat/docs/repomap.html",
  },
  "oh-security": {
    title: "OpenHands SDK: security and confirmation mode",
    url: "https://docs.openhands.dev/sdk/guides/security",
  },
  "oh-sandbox": {
    title: "OpenHands: sandboxes",
    url: "https://docs.openhands.dev/openhands/usage/sandboxes/overview",
  },
  "oh-condenser": {
    title: "OpenHands SDK: context condenser",
    url: "https://docs.openhands.dev/sdk/guides/context-condenser",
  },
  "oh-task": {
    title: "OpenHands SDK: task tool set",
    url: "https://docs.openhands.dev/sdk/guides/task-tool-set",
  },
  "oh-hooks": {
    title: "OpenHands: hooks",
    url: "https://docs.openhands.dev/openhands/usage/customization/hooks",
  },
  "swe-parsers": {
    title: "SWE-agent: action parsers",
    url: "https://swe-agent.com/latest/reference/parsers/",
  },
  "swe-history": {
    title: "SWE-agent: history processors",
    url: "https://swe-agent.com/latest/reference/history_processor_config/",
  },
  "swe-agent": {
    title: "SWE-agent: agent configuration",
    url: "https://swe-agent.com/latest/reference/agent_config/",
  },
  "swe-paper": {
    title: "Yang et al. (2024), SWE-agent, arXiv:2405.15793",
    url: "https://arxiv.org/abs/2405.15793",
  },
  "mini-home": {
    title: "mini-SWE-agent: overview",
    url: "https://mini-swe-agent.com/latest/",
  },
  "mini-cli": {
    title: "mini-SWE-agent: the mini command",
    url: "https://mini-swe-agent.com/latest/usage/mini/",
  },
} as const;

export type SourceKey = keyof typeof SOURCES;
export type Cell = { text: string; src?: SourceKey; inferred?: boolean };

export const HARNESSES = [
  { key: "claude-code", label: "Claude Code" },
  { key: "codex-cli", label: "Codex CLI" },
  { key: "aider", label: "Aider" },
  { key: "openhands", label: "OpenHands" },
  { key: "swe-agent", label: "SWE-agent" },
  { key: "mini-swe-agent", label: "mini-SWE-agent" },
] as const;

export type HarnessKey = (typeof HARNESSES)[number]["key"];

export const CHOICES = [
  "Tool calls",
  "Approvals",
  "Sandbox",
  "Context",
  "Sub-agents",
  "Hooks and checks",
  "Imitated as",
] as const;

export type Choice = (typeof CHOICES)[number];

export const MATRIX: Record<HarnessKey, Record<Choice, Cell>> = {
  "claude-code": {
    "Tool calls": {
      text: "Native tool use: named tools such as Read, Edit and Bash",
      src: "cc-perm",
    },
    Approvals: {
      text: "Manual (default) mode asks on first use of each tool; file reads and read-only commands need no approval; deny, then ask, then allow rules",
      src: "cc-perm",
    },
    Sandbox: {
      text: "Optional OS sandbox around shell commands, off by default; writes to the working directory, network through an allow-list; file tools stay outside it",
      src: "cc-sandbox",
    },
    Context: {
      text: "Auto-compaction summarises older history near the limit; /compact on demand",
      src: "cc-costs",
    },
    "Sub-agents": {
      text: "Each runs in a fresh context window and returns only its result",
      src: "cc-sub",
    },
    "Hooks and checks": {
      text: "PreToolUse can deny a call or replace its input; PostToolUse can replace the result",
      src: "cc-hooks",
    },
    "Imitated as": {
      text: "native · parallel · mode default (git status allowed) · summarising · no sandbox",
    },
  },
  "codex-cli": {
    "Tool calls": {
      text: "Native function calls (the API it is built on)",
      src: "openai-fc",
      inferred: true,
    },
    Approvals: {
      text: "Recommended for version-controlled folders: on-request approvals with workspace-write",
      src: "codex-approvals",
    },
    Sandbox: {
      text: "read-only, workspace-write or danger-full-access; network off by default in workspace-write",
      src: "codex-approvals",
    },
    Context: {
      text: "Auto-compaction at model_auto_compact_token_limit; tool_output_token_limit caps each stored tool output",
      src: "codex-config",
    },
    "Sub-agents": {
      text: "On by default; the parent receives summaries, not raw intermediate output",
      src: "codex-sub",
    },
    "Hooks and checks": {
      text: "PreToolUse can deny a call or return updatedInput; PostToolUse can add context",
      src: "codex-hooks",
    },
    "Imitated as": {
      text: "native · parallel · no prompts inside the sandbox · workspace sandbox, no network · summarising",
    },
  },
  aider: {
    "Tool calls": {
      text: "No tool calls: the model writes edits in a text edit format (diff, whole file …)",
      src: "aider-formats",
    },
    Approvals: {
      text: "Asks before running suggested shell commands (--yes-always says yes to all); edits are applied and auto-committed",
      src: "aider-options",
    },
    Sandbox: {
      text: "None described: commands run in your shell",
      inferred: true,
    },
    Context: {
      text: "A ranked repository map within --map-tokens; chat history summarised past a token limit",
      src: "aider-map",
    },
    "Sub-agents": { text: "None in the pages read", inferred: true },
    "Hooks and checks": {
      text: "Lints after each edit (and tests, with --auto-test); errors go back to the model",
      src: "aider-lint",
    },
    "Imitated as": {
      text: "text parsing (ReAct) · one call per turn · edits allowed · shell asks · summarising",
    },
  },
  openhands: {
    "Tool calls": {
      text: "Function-calling tools",
      src: "oh-task",
      inferred: true,
    },
    Approvals: {
      text: "Confirmation policies AlwaysConfirm, NeverConfirm, ConfirmRisky; a security analyser rates each action's risk",
      src: "oh-security",
    },
    Sandbox: {
      text: "A Docker sandbox is the recommended default: the agent's commands run in a container",
      src: "oh-sandbox",
    },
    Context: {
      text: "LLMSummarizingCondenser summarises older events past max_size",
      src: "oh-condenser",
    },
    "Sub-agents": {
      text: "A task tool delegates to a sub-agent with its own conversation, which returns its response",
      src: "oh-task",
    },
    "Hooks and checks": {
      text: "PreToolUse hooks can stop a tool call; PostToolUse, Stop and session hooks",
      src: "oh-hooks",
    },
    "Imitated as": {
      text: "native · parallel · auto, rm asks (risky) · summarising · container not drawn (its deletes hit the container)",
    },
  },
  "swe-agent": {
    "Tool calls": {
      text: "Configurable parsers; FunctionCallingParser recommended for models with function calling, ThoughtActionParser for text",
      src: "swe-parsers",
    },
    Approvals: {
      text: "No approval step: runs autonomously in its environment",
      src: "swe-paper",
      inferred: true,
    },
    Sandbox: {
      text: "Commands run in a separate execution environment (a container)",
      src: "swe-paper",
      inferred: true,
    },
    Context: {
      text: "LastNObservations elides all but the last n tool observations",
      src: "swe-history",
    },
    "Sub-agents": { text: "None in the pages read", inferred: true },
    "Hooks and checks": {
      text: "Re-queries the model up to max_requeries (3) after a format error or a blocked action",
      src: "swe-agent",
    },
    "Imitated as": {
      text: "native · one call per turn · no prompts · clipping old results",
    },
  },
  "mini-swe-agent": {
    "Tool calls": {
      text: "Bash only, without the tool-calling interface: commands are parsed from the model's text",
      src: "mini-home",
    },
    Approvals: {
      text: "confirm mode (the default) asks before every action; yolo runs them at once",
      src: "mini-cli",
    },
    Sandbox: {
      text: "Each action is an independent subprocess.run; no sandbox of its own by default",
      src: "mini-home",
      inferred: true,
    },
    Context: {
      text: "A completely linear history: every step appends to the messages",
      src: "mini-home",
    },
    "Sub-agents": { text: "None", inferred: true },
    "Hooks and checks": {
      text: "A cost limit ($3 by default) and an optional step limit",
      src: "mini-cli",
    },
    "Imitated as": {
      text: "text parsing (ReAct) · one call per turn · ask every time · no compaction",
    },
  },
};
