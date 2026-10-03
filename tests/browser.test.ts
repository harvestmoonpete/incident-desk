import { test } from "node:test";
import assert from "node:assert/strict";
import { BrowserDesk, diagnose, fixtures } from "../src/data";
test("all scenarios produce traceable hypotheses and reset restores seed", async () => {
  const d = new BrowserDesk();
  for (const s of ["deployment", "pool", "queue"] as const) {
    await d.select(s);
    const r = await d.investigate();
    assert.equal(r.hypotheses[0].confidence, "high");
    for (const id of r.hypotheses[0].evidence_ids)
      assert.ok(fixtures[s].some((e) => e.id === id));
  }
  await d.reset();
  assert.equal((await d.snapshot()).scenario, "deployment");
});
test("missing and misleading evidence do not invent certainty", () => {
  assert.equal(diagnose([]).hypotheses[0].confidence, "low");
  assert.equal(
    diagnose([
      { id: "deploy-1", kind: "deployment", summary: "new release", value: 1 },
    ]).hypotheses[0].confidence,
    "low",
  );
});
