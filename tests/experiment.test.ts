import { test } from "node:test";
import assert from "node:assert/strict";
import { compareEvidence } from "../src/evidenceExperiment";
import { fixtures } from "../src/data";

for (const scenario of ["deployment", "pool", "queue"] as const) {
  test(`${scenario}: removing supporting evidence weakens the rules without changing the snapshot`, () => {
    const original = structuredClone(fixtures[scenario]);
    const all = compareEvidence(original, []);
    assert.equal(all.changed, false);
    const support = all.baseline.hypotheses[0].evidence_ids;
    for (const id of support) {
      const comparison = compareEvidence(original, [id]);
      assert.equal(comparison.changed, true);
      assert.equal(
        comparison.result.hypotheses[0].title,
        "Insufficient evidence",
      );
      assert.equal(comparison.result.hypotheses[0].confidence, "low");
      assert.ok(
        comparison.result.hypotheses.every((h) =>
          h.evidence_ids.every((ref) => comparison.includedIds.includes(ref)),
        ),
      );
    }
    const nonSupporting = original
      .filter((item) => !support.includes(item.id))
      .map((item) => item.id);
    assert.equal(compareEvidence(original, nonSupporting).changed, false);
    assert.deepEqual(original, fixtures[scenario]);
  });
}
test("empty evidence and unknown exclusion IDs never manufacture support", () => {
  const empty = compareEvidence([], ["missing"]);
  assert.deepEqual(empty.excludedIds, []);
  assert.equal(empty.changed, false);
  assert.equal(empty.result.hypotheses[0].confidence, "low");
  const allRemoved = compareEvidence(
    fixtures.queue,
    fixtures.queue.map((item) => item.id),
  );
  assert.deepEqual(allRemoved.includedIds, []);
  assert.equal(allRemoved.result.hypotheses[0].title, "Insufficient evidence");
});
