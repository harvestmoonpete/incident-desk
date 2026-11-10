import { diagnose, type Evidence, type Hypothesis } from "./data";

export function compareEvidence(evidence: Evidence[], excluded: string[]) {
  const snapshot = structuredClone(evidence);
  const excludedIds = snapshot
    .filter((item) => excluded.includes(item.id))
    .map((item) => item.id);
  const included = snapshot.filter((item) => !excludedIds.includes(item.id));
  const baseline = diagnose(snapshot, "experiment-baseline");
  const result = diagnose(included, "experiment-selected");
  const signature = (hypotheses: Hypothesis[]) =>
    JSON.stringify(
      hypotheses
        .map((item) => ({
          title: item.title,
          confidence: item.confidence,
          evidence_ids: [...item.evidence_ids].sort(),
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    );
  return {
    evidence: snapshot,
    excludedIds,
    includedIds: included.map((item) => item.id),
    baseline,
    result,
    changed: signature(baseline.hypotheses) !== signature(result.hypotheses),
  };
}
