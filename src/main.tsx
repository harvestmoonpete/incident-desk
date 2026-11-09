import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { desk, live, scenarios, Snapshot, Report, Scenario } from "./data";
import "./style.css";
function App() {
  const [state, setState] = useState<Snapshot | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [model, setModel] = useState(false),
    [selected, setSelected] = useState("");
  const [challenge, setChallenge] = useState(false);
  const [inspected, setInspected] = useState<string[]>([]);
  const [prediction, setPrediction] = useState("");
  const [answer, setAnswer] = useState("");
  const challengeComplete = challenge && answer === "queue";
  function inspectSignal(id: string) {
    setSelected(id);
    if (
      challenge &&
      report?.hypotheses.some((h) => h.evidence_ids.includes(id))
    )
      setInspected((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }
  function startChallenge() {
    void run(async () => {
      setState(await desk.select("queue"));
      setReport(null);
      setSelected("");
      setModel(false);
      setChallenge(true);
      setInspected([]);
      setPrediction("");
      setAnswer("");
    });
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unexpected error. Retry the operation.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void run(async () => setState(await desk.snapshot()));
  }, []);
  function choose(s: Scenario) {
    setChallenge(false);
    void run(async () => {
      setState(await desk.select(s));
      setReport(null);
      setSelected("");
    });
  }
  function downloadReport() {
    if (!report || !state) return;
    const exportData = {
      version: 1,
      environment: live ? "local services" : "offline browser fixtures",
      scenario: state.scenario,
      report,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident-${state.scenario}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="./">
          <span className="brandmark">iD</span>Incident Desk
        </a>
        <div className="eyebrow">INVESTIGATION WORKSPACE</div>
        <p className="sideintro">
          Small signals.
          <br />
          Clearer answers.
        </p>
        <div className="navlabel">SCENARIO LIBRARY</div>
        <nav aria-label="Incident scenarios">
          {(Object.keys(scenarios) as Scenario[]).map((s) => (
            <button
              disabled={busy}
              aria-pressed={state?.scenario === s}
              className={"scenario " + (state?.scenario === s ? "active" : "")}
              key={s}
              onClick={() => choose(s)}
            >
              <span className="number">{scenarios[s].icon}</span>
              <span>
                <strong>{scenarios[s].name}</strong>
                <small>{scenarios[s].subtitle}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidefooter">
          <span className="dot" /> {live ? "LOCAL SERVICES" : "BROWSER SANDBOX"}
          <p>
            {live
              ? "Fault injection is isolated to your Docker environment."
              : "Deterministic fixtures. No live backend or AI requests."}
          </p>
          <a href="https://github.com/harvestmoonpete/incident-desk">
            View source ↗
          </a>
        </div>
      </aside>
      <main>
        <header>
          <span>
            WORKSPACE <span className="muted">/</span> INCIDENT INVESTIGATION
          </span>
          <button
            disabled={busy}
            className="quiet"
            onClick={() =>
              void run(async () => {
                setChallenge(false);
                setState(await desk.reset());
                setReport(null);
                setSelected("");
              })
            }
          >
            ↺ Reset workspace
          </button>
        </header>
        <section className="intro">
          <div>
            <div className="eyebrow">EVIDENCE BEFORE ANSWERS</div>
            <h1>Follow the signals.</h1>
            <p>
              Reproduce an incident. Inspect the evidence.
              <br />
              Build a diagnosis you can trace back to its source.
            </p>
          </div>
          <div className="modebadge">
            <span className="dot" />
            {live ? "Live local telemetry" : "Offline interactive demo"}
          </div>
        </section>
        <section className="challenge" aria-labelledby="challenge-title">
          <p className="eyebrow">GUIDED CHALLENGE · ABOUT 3 MINUTES</p>
          <h2 id="challenge-title">
            Explain a backlog while HTTP requests still succeed.
          </h2>
          <p>
            Customers say background work is late. Is this a deployment
            regression, database exhaustion, or worker capacity? Build a case
            from evidence rather than guessing from the symptom.
          </p>
          <p>
            {live
              ? "Starting selects a queue fault in the local telemetry service."
              : "Starting loads offline queue fixtures. No production telemetry or live AI is used."}
          </p>
          {!challenge ? (
            <button
              className="primary"
              disabled={busy || !state}
              onClick={startChallenge}
            >
              Start investigation challenge
            </button>
          ) : (
            <>
              <ol className="challenge-steps">
                <li>✓ Load the backlog scenario.</li>
                <li>
                  {report ? "✓" : "○"} Use Run investigation below to collect a
                  traceable report.
                </li>
                <li>
                  {inspected.length >= 2 ? "✓" : "○"} Follow both evidence links
                  in the report to inspect the cited signals.
                </li>
                <li>
                  {challengeComplete ? "✓" : "○"} Choose the diagnosis supported
                  by those signals.
                </li>
              </ol>
              <p role="status" className="challenge-status">
                {challengeComplete
                  ? "Challenge complete: the backlog and slow active worker support a throughput deficit, while successful HTTP requests do not establish worker health."
                  : !report
                    ? "Next: run an investigation using the control below."
                    : inspected.length < 2
                      ? `Next: inspect the report's evidence references (${inspected.length} of 2 opened).`
                      : "Evidence inspected. Choose a diagnosis, then check your reasoning."}
              </p>
              <label className="challenge-choice">
                Your diagnosis
                <select
                  value={prediction}
                  disabled={!report || inspected.length < 2 || busy}
                  onChange={(e) => {
                    setPrediction(e.target.value);
                    setAnswer("");
                  }}
                >
                  <option value="">Choose a diagnosis</option>
                  <option value="deployment">Deployment regression</option>
                  <option value="pool">Database connection exhaustion</option>
                  <option value="queue">Worker throughput deficit</option>
                </select>
              </label>
              <div className="challenge-actions">
                <button
                  className="primary"
                  disabled={!prediction || inspected.length < 2 || busy}
                  onClick={() => setAnswer(prediction)}
                >
                  Check diagnosis
                </button>
                <button className="quiet" onClick={() => setChallenge(false)}>
                  Exit challenge
                </button>
              </div>
              {answer && !challengeComplete && (
                <p role="status">
                  That diagnosis is not supported by these signals. The queue is
                  growing while the active worker completes too little work.
                  Revisit queue-1 and worker-1, then try again.
                </p>
              )}
              {challengeComplete && (
                <p>
                  Next useful action: measure arrival and completion rates
                  before changing worker capacity. Preserve the report with
                  Download report JSON below. A hypothesis still needs a
                  targeted recovery and a fresh measurement to confirm it.
                </p>
              )}
            </>
          )}
        </section>
        <div className="guide">
          <b>YOUR THREE-MINUTE WALKTHROUGH</b>
          <span>
            <i>1</i> Choose a fault
          </span>
          <span>
            <i>2</i> Inspect signals
          </span>
          <span>
            <i>3</i> Investigate
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}{" "}
            <button
              onClick={() =>
                void run(async () => setState(await desk.snapshot()))
              }
            >
              Retry connection
            </button>
          </div>
        )}
        <div aria-live="polite" className="sr">
          {busy ? "Working…" : "Ready"}
        </div>
        <section className="incident">
          <div>
            <span className="tag">{state ? "ACTIVE SCENARIO" : "LOADING"}</span>
            <h2>
              {state
                ? scenarios[state.scenario].name
                : "Connecting to the workspace…"}
            </h2>
            <p>
              {live
                ? "Measurements come from requests sent to a fault-injectable Node.js service."
                : "Measurements below are reproducible browser fixtures, not live service metrics."}
            </p>
          </div>
          <div className="investigate">
            {live && (
              <label>
                <input
                  type="checkbox"
                  checked={model}
                  onChange={(e) => setModel(e.target.checked)}
                />{" "}
                Use configured model
              </label>
            )}
            <button
              className="primary"
              disabled={busy || !state}
              onClick={() =>
                void run(async () => {
                  const result = await desk.investigate(
                    model ? "model" : "rules",
                  );
                  setInspected([]);
                  setAnswer("");
                  setReport({
                    ...result,
                    evidence: result.evidence ?? state?.evidence ?? [],
                  });
                  if (result.evidence && state)
                    setState({ ...state, evidence: result.evidence });
                })
              }
            >
              {busy ? "Collecting signals…" : "Run investigation"}{" "}
              <span>↗</span>
            </button>
          </div>
        </section>
        <div className="columns">
          <section className="panel">
            <div className="panelhead">
              <h2>Collected evidence</h2>
              <span>{state?.evidence.length ?? 0} SIGNALS</span>
            </div>
            <p className="paneldesc">
              Observations first. Every conclusion cites a source.
            </p>
            <div className="evidence">
              {state?.evidence.map((e, i) => (
                <article
                  id={e.id}
                  key={e.id}
                  className={"signal " + (selected === e.id ? "highlight" : "")}
                >
                  <div className="signalhead">
                    <span className="signalicon">
                      {["⌁", "↗", "≋"][i % 3]}
                    </span>
                    <span>{e.kind.toUpperCase()}</span>
                    <code>{e.id}</code>
                  </div>
                  <p>{e.summary}</p>
                  <div className="measure">
                    <strong>{e.value}</strong>
                    <span>observed value</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="panel report">
            <div className="panelhead">
              <h2>Investigation report</h2>
              <button
                className="quiet"
                disabled={!report || busy}
                onClick={downloadReport}
              >
                Download report JSON
              </button>
            </div>
            {!report ? (
              <div className="empty">
                <div className="orb">⌕</div>
                <h3>A diagnosis starts with evidence.</h3>
                <p>
                  Run an investigation to connect the signals
                  <br />
                  and identify the most likely cause.
                </p>
                <small>
                  {live
                    ? "Rules by default · Optional server-side AI"
                    : "Transparent rules · No live AI"}
                </small>
              </div>
            ) : (
              <div className="findings">
                <div className="reportmode">
                  {report.mode.toUpperCase()} · {report.id}
                </div>
                {report.hypotheses.map((h, i) => (
                  <article key={i}>
                    <div className="confidence">
                      #{i + 1} HYPOTHESIS <span>{h.confidence} confidence</span>
                    </div>
                    <h3>{h.title}</h3>
                    <p>{h.reasoning}</p>
                    <div className="refs">
                      {h.evidence_ids.map((id) => (
                        <a
                          key={id}
                          href={"#" + id}
                          onClick={() => inspectSignal(id)}
                        >
                          ↗ {id}
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
                <h4>OBSERVATIONS</h4>
                <ul>
                  {report.observations.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
                <h4>RECOMMENDED NEXT STEPS</h4>
                <ol>
                  {report.next_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>
        <footer>
          BUILT TO EXPLAIN THE WHY{" "}
          <span>
            Python investigations · TypeScript telemetry · React workspace
          </span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
