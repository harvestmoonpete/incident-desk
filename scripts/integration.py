"""Run against docker compose up --build --wait. Uses only Python stdlib."""

import json
import urllib.request
import urllib.error
import os

base = os.environ.get("BASE_URL", "http://localhost:8082")


def call(path, body=None):
    req = urllib.request.Request(
        base + "/api" + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


for scenario, title in [
    ("deployment", "Deployment regression"),
    ("pool", "Database connection exhaustion"),
    ("queue", "Worker throughput deficit"),
]:
    snapshot = call("/scenario", {"scenario": scenario})
    assert snapshot["scenario"] == scenario
    report = call("/investigations", {"mode": "rules"})
    assert report["hypotheses"][0]["title"] == title, report
    assert call("/investigations/" + report["id"])["id"] == report["id"]
    ids = {e["id"] for e in snapshot["evidence"]}
    assert all(set(h["evidence_ids"]) <= ids for h in report["hypotheses"])
    print("PASS", scenario, title)
assert call("/reset", {})["scenario"] == "deployment"
try:
    call("/scenario", {"scenario": "bad"})
except urllib.error.HTTPError as e:
    assert e.code == 422
else:
    raise AssertionError("invalid scenario accepted")
try:
    call("/investigations", {"mode": "model"})
except urllib.error.HTTPError as e:
    assert e.code in (502, 503)
else:
    raise AssertionError("model expected to be unconfigured in smoke test")
print("PASS reset, validation, unavailable model")
