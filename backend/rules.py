from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class Evidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    kind: str
    summary: str = Field(max_length=1000)
    value: float


class Hypothesis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(max_length=200)
    confidence: Literal["low", "medium", "high"]
    evidence_ids: list[str] = Field(max_length=20)
    reasoning: str = Field(max_length=2000)


class Findings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    observations: list[str] = Field(max_length=20)
    hypotheses: list[Hypothesis] = Field(min_length=1, max_length=5)
    next_steps: list[str] = Field(max_length=10)


def diagnose(evidence):
    values = {e["id"]: e["value"] for e in evidence}
    hypotheses = []

    def add(title, refs, why):
        hypotheses.append(
            dict(title=title, confidence="high", evidence_ids=refs, reasoning=why)
        )

    if values.get("deploy-1", 0) > 0 and values.get("http-1", 0) > 0:
        add(
            "Deployment regression",
            ["deploy-1", "http-1"],
            "The new release coincides with failing handler requests. Inspect the changed handler and compare against the prior release.",
        )
    if values.get("pool-1", 0) >= 4 and values.get("http-1", 0) > 0:
        add(
            "Database connection exhaustion",
            ["pool-1", "http-1"],
            "All pool slots are held while requests fail. Release leaked connections and verify acquisition latency.",
        )
    if values.get("queue-1", 0) >= 5 and values.get("worker-1", 0) > 0:
        add(
            "Worker throughput deficit",
            ["queue-1", "worker-1"],
            "The burst exceeds measured worker capacity. Reduce arrivals or increase processing capacity and verify the backlog drains.",
        )
    if not hypotheses:
        hypotheses.append(
            dict(
                title="Insufficient evidence",
                confidence="low",
                evidence_ids=[],
                reasoning="Collect corroborating deployment, error, pool and worker measurements before assigning a cause.",
            )
        )
    return dict(
        observations=[e["summary"] for e in evidence],
        hypotheses=hypotheses,
        next_steps=[
            "Reproduce the suspected fault in an isolated environment.",
            "Apply a targeted recovery and compare the same measurements.",
            "Preserve this evidence with the incident record.",
        ],
    )


def validate_findings(raw, evidence):
    result = Findings.model_validate(raw)
    ids = {e["id"] for e in evidence}
    for h in result.hypotheses:
        if not set(h.evidence_ids) <= ids:
            raise ValueError("Model cited an unknown evidence identifier")
        if h.confidence != "low" and not h.evidence_ids:
            raise ValueError("Confident conclusions require supporting evidence")
    return result.model_dump()
