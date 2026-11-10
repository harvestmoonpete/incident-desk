import { useRef, useState, type RefObject } from "react";
import type { Report } from "./data";
import { compareEvidence } from "./evidenceExperiment";

type Comparison = ReturnType<typeof compareEvidence>;
export function EvidenceLab({
  report,
  live,
  headingRef,
}: {
  report: Report;
  live: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const evidence = report.evidence ?? [];
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [prediction, setPrediction] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const baseline = compareEvidence(evidence, []);
  const supportingId = baseline.baseline.hypotheses.flatMap(
    (item) => item.evidence_ids,
  )[0];
  function selectEvidence(ids: string[]) {
    setExcluded(ids);
    setComparison(null);
    setPrediction("");
  }
  function downloadComparison() {
    if (!comparison) return;
    const data = {
      version: 1,
      mode: "browser-rule-experiment",
      source: {
        reportId: report.id,
        reportMode: report.mode,
        environment: live ? "captured local telemetry" : "offline fixtures",
      },
      limitations:
        "Both diagnoses use deterministic browser rules on captured evidence. This is not a new telemetry collection, a live model response, or a recovery measurement. Removing evidence does not remove the real fault.",
      prediction,
      ...comparison,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "incident-evidence-experiment.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="panel evidence-lab"
      aria-labelledby="evidence-lab-title"
    >
      <div className="lab-heading">
        <p className="eyebrow">INTERACTIVE EVIDENCE LAB</p>
        <h2 id="evidence-lab-title" tabIndex={-1} ref={headingRef}>
          Would the diagnosis survive missing evidence?
        </h2>
        <p>
          Withhold a signal, predict the outcome, then test the rules. Discover
          which observations the diagnosis depends on.
        </p>
      </div>
      <p className="lab-mode">
        Browser-only experiment using{" "}
        {live
          ? "this report’s captured local telemetry"
          : "this report’s offline fixtures"}
        . Both comparisons use deterministic rules, even if the original report
        used a model. The original report stays unchanged.
      </p>
      <div className="lab-grid">
        <div className="lab-controls">
          <fieldset>
            <legend>1. Choose the available evidence</legend>
            <p>Uncheck a signal to simulate a missing observation.</p>
            {evidence.map((item) => (
              <label
                className={
                  "lab-signal " + (excluded.includes(item.id) ? "excluded" : "")
                }
                key={item.id}
              >
                <input
                  type="checkbox"
                  aria-label={`Include ${item.id}`}
                  checked={!excluded.includes(item.id)}
                  onChange={() =>
                    selectEvidence(
                      excluded.includes(item.id)
                        ? excluded.filter((id) => id !== item.id)
                        : [...excluded, item.id],
                    )
                  }
                />
                <span>
                  <span className="lab-signal-id">
                    {item.id}
                    <span>
                      {excluded.includes(item.id) ? "Withheld" : "Included"}
                    </span>
                  </span>
                  <span className="lab-signal-summary">{item.summary}</span>
                  <small>Captured value: {item.value}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="lab-presets">
            <button
              className="quiet"
              disabled={!supportingId}
              onClick={() => selectEvidence([supportingId])}
            >
              Hide a supporting signal
            </button>
            <button className="quiet" onClick={() => selectEvidence([])}>
              Restore all signals
            </button>
          </div>
          <label className="lab-prediction">
            2. Predict the rule result
            <select
              value={prediction}
              onChange={(event) => {
                setPrediction(event.target.value);
                setComparison(null);
              }}
            >
              <option value="">Choose a prediction</option>
              <option value="same">Same hypotheses and confidence</option>
              <option value="changed">
                Different or insufficient evidence
              </option>
            </select>
          </label>
          <button
            className="primary"
            disabled={!prediction || !evidence.length}
            onClick={() => {
              setComparison(compareEvidence(evidence, excluded));
              requestAnimationFrame(() => {
                resultHeading.current?.focus();
                resultHeading.current?.scrollIntoView({ block: "start" });
              });
            }}
          >
            3. Test selected evidence
          </button>
        </div>
        <div className="lab-results">
          <section
            className="lab-result-card"
            aria-label="Full evidence diagnosis"
          >
            <p className="lab-result-label">
              BASELINE · {evidence.length} SIGNALS
            </p>
            <h3>Full evidence</h3>
            {baseline.baseline.hypotheses.map((item) => (
              <div className="lab-hypothesis" key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.confidence} confidence · rules</p>
                <small>
                  References:{" "}
                  {item.evidence_ids.join(", ") ||
                    "None — insufficient evidence"}
                </small>
              </div>
            ))}
          </section>
          <section
            className={
              "lab-result-card " + (comparison?.changed ? "changed" : "")
            }
            aria-label="Selected evidence diagnosis"
          >
            <p className="lab-result-label">
              EXPERIMENT · {evidence.length - excluded.length} SIGNALS
            </p>
            <h3 ref={resultHeading} tabIndex={-1}>
              Selected evidence
            </h3>
            {comparison ? (
              <>
                {comparison.result.hypotheses.map((item) => (
                  <div className="lab-hypothesis" key={item.title}>
                    <h4>{item.title}</h4>
                    <p>{item.confidence} confidence · rules</p>
                    <small>
                      References:{" "}
                      {item.evidence_ids.join(", ") ||
                        "None — insufficient evidence"}
                    </small>
                  </div>
                ))}
                <p
                  className={
                    "lab-feedback " +
                    ((prediction === "changed") === comparison.changed
                      ? "correct"
                      : "incorrect")
                  }
                  role="status"
                >
                  {comparison.changed
                    ? "Diagnosis changed."
                    : "Diagnosis unchanged."}{" "}
                  {(prediction === "changed") === comparison.changed
                    ? "Your prediction matched the rule result."
                    : "Your prediction did not match the rule result. Compare the references above."}
                </p>
                <p className="lab-takeaway">
                  {comparison.changed
                    ? "Without the supporting observations, these rules cannot justify the same conclusion. Missing evidence is a reason to collect more data, not proof that the incident is resolved."
                    : "The retained observations support the same rule result. This does not mean every omitted signal is irrelevant in a real investigation."}
                </p>
                <button className="quiet" onClick={downloadComparison}>
                  Download comparison JSON
                </button>
              </>
            ) : (
              <p className="lab-placeholder">
                Choose a prediction and test your selection to reveal the
                result.
              </p>
            )}
          </section>
        </div>
      </div>
      <details className="lab-rules">
        <summary>See the decision rules</summary>
        <ul>
          <li>Deployment regression: deploy-1 &gt; 0 and http-1 &gt; 0.</li>
          <li>Connection exhaustion: pool-1 ≥ 4 and http-1 &gt; 0.</li>
          <li>Worker throughput deficit: queue-1 ≥ 5 and worker-1 &gt; 0.</li>
          <li>
            No matching rule: insufficient evidence, with low confidence. These
            labels are rule outputs, not calibrated probabilities.
          </li>
        </ul>
        <p>
          No new telemetry or model requests are made. Withholding evidence
          changes the information available to the rules; it does not simulate a
          service repair.
        </p>
      </details>
    </section>
  );
}
