"""The vendored engine files are the engine repository's files at the pinned commit."""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VENDORED = json.loads((ROOT / "src/lib/engine/vendor/VENDORED.json").read_text())


def test_every_vendored_file_matches_its_hash():
    assert len(VENDORED["files"]) >= 15
    for path, rec in VENDORED["files"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == rec["sha256"], path


def test_installed_reference_is_the_vendored_commit():
    d = importlib.metadata.distribution("agent-loop-sim")
    assert json.loads(d.read_text("direct_url.json"))["vcs_info"]["commit_id"] == VENDORED["commit"]


def test_vendored_traces_and_merges_are_the_packages():
    from importlib import resources

    merges = resources.files("agent_loop_sim").joinpath("data/qwen2.5-merges.txt").read_bytes()
    assert hashlib.sha256(merges).hexdigest() == VENDORED["files"]["public/tokenizer/qwen2.5-merges.txt"]["sha256"]


def test_recorded_traces_replay_in_the_reference():
    from agent_loop_sim.harness import replay_trace

    traces = sorted((ROOT / "src/data/traces").glob("*.json"))
    assert len(traces) >= 3
    for p in traces:
        t = json.loads(p.read_text())
        ev = replay_trace(t)
        assert ev[-1]["status"] == t["outcome"]["status"]
