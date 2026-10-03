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
    void run(async () => {
      setState(await desk.select(s));
      setReport(null);
      setSelected("");
    });
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
                  setReport(result);
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
                    <span className="signalicon">{["⌁", "↗", "≋"][i % 3]}</span>
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
              <span>{report ? "COMPLETE" : "AWAITING RUN"}</span>
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
                          onClick={() => setSelected(id)}
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
