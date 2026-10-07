"""The site's parity fixtures, from the Python reference engine at the vendored commit.

    python scripts/make_fixtures.py          # write tests/fixtures/site_fixtures.json
    python scripts/make_fixtures.py --check  # fail if it is out of date (CI)

For every run a chapter animates (src/data/chapter_configs.json: a scenario and a policy, or
a recorded trace), the reference engine's events and the animation frames derived from
them; and every seeded sweep a chapter charts (src/data/sweep_configs.json). tests/unit/frames.test.ts runs the same configurations with the vendored TS port and
requires identical frames; tests/e2e/frames.spec.ts checks the captions on the page.

The engine must be installed from git at the commit in src/lib/engine/vendor/VENDORED.json
(reference/requirements.txt pins it); this script refuses to run otherwise.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import sys
from pathlib import Path

from agent_loop_sim import views
from agent_loop_sim.harness import replay_trace, run
from agent_loop_sim.scenarios import scenario
from agent_loop_sim.sweeps import retry_sweep

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests/fixtures/site_fixtures.json"


def installed_commit() -> str:
    d = importlib.metadata.distribution("agent-loop-sim")
    info = json.loads(d.read_text("direct_url.json") or "{}")
    return info.get("vcs_info", {}).get("commit_id", "")


def events_for(cfg: dict) -> list[dict]:
    if "trace" in cfg:
        t = json.loads((ROOT / "src/data/traces" / f"{cfg['trace']}.json").read_text())
        return replay_trace(t)
    return run(scenario(cfg["scenario"]), cfg.get("policy"), seed=cfg.get("seed"))


def build() -> str:
    vendored = json.loads((ROOT / "src/lib/engine/vendor/VENDORED.json").read_text())
    commit = installed_commit()
    if commit != vendored["commit"]:
        sys.exit(f"installed agent-loop-sim is at {commit[:7] or '?'}, the site vendors {vendored['commit'][:7]}: "
                 "pip install -r reference/requirements.txt")
    configs = json.loads((ROOT / "src/data/chapter_configs.json").read_text())
    out: dict = {"commit": commit, "chapters": {}}
    for chapter, variants in configs.items():
        out["chapters"][chapter] = {}
        for key, cfg in variants.items():
            ev = events_for(cfg)
            out["chapters"][chapter][key] = {
                "events": ev,
                "loop": views.loop_frames(ev),
                "toolcall": views.toolcall_frames(ev),
                "budget": views.budget_frames(ev),
                "cache": views.cache_frames(ev),
                "permission": views.permission_frames(ev),
                "timeline": views.timeline(ev),
                "agents": views.agents_frames(ev),
                "pipeline": views.pipeline_frames(ev),
            }
    sweeps = json.loads((ROOT / "src/data/sweep_configs.json").read_text())
    out["sweeps"] = {}
    for name, sw in sweeps.items():
        out["sweeps"][name] = {
            key: retry_sweep(sw["scenario"], sw["budgets"], list(range(sw["seeds"])), pol)
            for key, pol in sw["policies"].items()
        }
    return json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    text = build()
    if a.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            sys.exit("tests/fixtures/site_fixtures.json is out of date (run python scripts/make_fixtures.py)")
        print("site fixtures up to date")
    else:
        OUT.write_text(text, encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
