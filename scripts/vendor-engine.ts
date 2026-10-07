/**
 * scripts/vendor-engine.ts
 *
 * Vendor Agent_Loop_Sim's TypeScript port, its tokenizer data, its recorded traces and its
 * parity fixtures at a pinned commit, and record which one:
 *
 *     pnpm vendor:engine <commit> [path/to/Agent_Loop_Sim]
 *
 * Every file is copied byte for byte from `git show <commit>:<path>` (never the working
 * tree, so local edits can't leak in). `src/lib/engine/vendor/VENDORED.json` records the
 * repository, the full commit hash and each file's SHA-256; the commit must already be on
 * the engine's `origin`. tests/unit/vendor.test.ts fails if a copy and its recorded hash
 * disagree, and the CI's Python job checks that the reference installed from git at that
 * commit regenerates this site's fixtures (scripts/make_fixtures.py).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ref = process.argv[2];
if (!ref) {
  console.error("usage: pnpm vendor:engine <commit> [path/to/Agent_Loop_Sim]");
  process.exit(2);
}
const repo = resolve(
  process.argv[3] ?? join(process.cwd(), "..", "Agent_Loop_Sim"),
);
const git = (...args: string[]): string =>
  execFileSync("git", ["-C", repo, ...args], { encoding: "utf-8" }).trim();

const commit = git("rev-parse", "--verify", `${ref}^{commit}`);
if (!/origin\//.test(git("branch", "-r", "--contains", commit))) {
  console.error(`${commit} is not on origin: push it before vendoring.`);
  process.exit(1);
}
const list = (dir: string) =>
  git("ls-tree", "--name-only", commit, `${dir}/`).split("\n").filter(Boolean);

// source path in the engine repo -> destination in this site
const map: Record<string, string> = {};
for (const p of list("ts/src"))
  map[p] = join("src/lib/engine/vendor", p.slice("ts/src/".length));
map["src/agent_loop_sim/data/qwen2.5-merges.txt"] =
  "public/tokenizer/qwen2.5-merges.txt";
map["src/agent_loop_sim/data/QWEN2.5-LICENSE"] =
  "public/tokenizer/QWEN2.5-LICENSE";
for (const p of list("traces").filter((p) => /\.json$/.test(p)))
  map[p] = join("src/data/traces", p.slice("traces/".length));
map["fixtures/engine_fixtures.json"] = "tests/fixtures/engine_fixtures.json";

const files: Record<string, { from: string; sha256: string }> = {};
for (const [from, to] of Object.entries(map)) {
  const buf = execFileSync("git", ["-C", repo, "show", `${commit}:${from}`], {
    maxBuffer: 64 * 1024 * 1024,
  });
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, buf);
  files[to] = { from, sha256: createHash("sha256").update(buf).digest("hex") };
}
const record = {
  repository: "https://github.com/BrendanJamesLynskey/Agent_Loop_Sim",
  commit,
  committed: git("show", "-s", "--format=%cI", commit),
  files,
};
writeFileSync(
  "src/lib/engine/vendor/VENDORED.json",
  JSON.stringify(record, null, 2) + "\n",
);
console.log(
  `vendored ${Object.keys(files).length} files @ ${commit.slice(0, 7)}`,
);
