# Incident Desk

**Evidence before answers.** An engineering portfolio project by [harvestmoonpete](https://github.com/harvestmoonpete) demonstrating TypeScript telemetry, Python investigations, evaluation, and a React investigation workspace.

[Open the interactive demo](https://harvestmoonpete.github.io/incident-desk/)

## Three-minute walkthrough

1. Choose a deployment regression, exhausted database pool, or growing work queue.
2. Inspect the observations and their stable evidence IDs.
3. Run the investigation, follow evidence links, and inspect the proposed next steps.
4. Switch scenarios or reset the workspace to repeat the demonstration.

The public Pages demo runs deterministic browser fixtures and transparent rules. It does **not** run backend services, measure production throughput, or call live AI. Reset restores the original scenario; no login or key is needed. The same typed React interface switches to HTTP adapters for Compose.

## Run real services

Requires Docker Compose v2. Run:

```sh
docker compose up --build --wait
```

Open **http://localhost:8082**. All other ports remain internal. The Compose project name is `incident-desk` so other portfolio projects run alongside it. PostgreSQL initializes automatically; reports persist in `desk-db`. `docker compose down` preserves reports; `docker compose down -v` deletes this demo's data. Reset restores the scenario without deleting saved reports.

The Node/Fastify telemetry service injects real faults into its demo request handler. A deployment fault returns deterministic HTTP 500s; the pool fault holds all four actual PostgreSQL pool connections and causes acquisition timeouts; the queue fault adds a 20-job burst while a timer processes one job every five seconds. Sampling performs 12 real Fastify handler invocations through Fastify's injection harness, rather than sending network traffic to a production service. Queue samples add another burst so the backlog remains observable. Scenario changes release held connections and reset counters.

Python/FastAPI collects bounded telemetry, applies explicit rules, stores reports and the supporting evidence transactionally in PostgreSQL, and optionally calls a configured model. The browser polls no background production endpoints; evidence is collected on scenario selection or investigation. Fault controls are designed for this isolated local demonstration. Do not expose the Compose services as a public operational control plane.

## Architecture and interfaces

```text
React / TypeScript -> nginx -> Python FastAPI -> Node / Fastify
                               |                  |
                               +---- PostgreSQL --+
```

- `GET /api/evidence`: collect current scenario evidence.
- `POST /api/scenario` with `{"scenario":"deployment"|"pool"|"queue"}`: select a fault and sample evidence.
- `POST /api/reset`: restore the deployment scenario.
- `POST /api/investigations` with `{"mode":"rules"|"model"}`: collect evidence, produce and persist a report.
- `GET /api/investigations/{id}`: retrieve a saved report.

Evidence contains `id`, `kind`, `summary`, and numeric `value`. Reports separate observed facts, ranked hypotheses, confidence, cited evidence IDs, and suggested actions. Rules require corroborating signals; a deployment with no failing requests cannot alone justify a deployment diagnosis. Missing evidence produces low confidence, not fabricated certainty. Rules are intentionally inspectable and narrow, not a general purpose incident classifier.

## Optional live model

Set `MODEL_API_KEY`, `MODEL_NAME`, and optionally `MODEL_BASE_URL` in the shell before Compose startup. The default base URL is `https://api.openai.com/v1`; use a provider implementing the chat completions JSON response format. Select “Use configured model” in the local UI. Environment values stay on the API container and never enter the frontend bundle.

Model requests receive at most 20 evidence items and 18,000 characters. The response must match the Pydantic findings schema, reference only supplied evidence IDs, and support any medium/high confidence conclusion with references. This validates structure and provenance, not factual entailment; a human must assess the reasoning. Provider failures, missing configuration, malformed output, and invented references return explicit errors. There is no silent rules fallback.

## Development and evaluation

Node 22+, Python 3.12:

```sh
npm ci
npm run dev
npm run build
npm run check:service
npm test
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python -m unittest discover -s backend -v
# With Compose running and no model key configured:
python3 scripts/integration.py
```

Unit evaluations cover all diagnoses, insufficient/misleading evidence, malformed model output, unknown references, and unsupported confidence. Compose integration checks real faults, persistent report retrieval, reset, validation and explicit unavailable-model behavior. CI runs these checks on Ubuntu and deploys the static demo only after both unit/build checks and Compose integration pass. Enable GitHub Pages with the **GitHub Actions** source.

Vite defaults to `/incident-desk/` for Pages. Compose builds with `VITE_BASE=/` and `VITE_MODE=live`. The default browser build intentionally has no API key or backend dependency.

## Tradeoffs

The shared telemetry sandbox serializes mutations and collection through one API process; it is deliberately a single-user demonstration. Telemetry counters reset on container restart; saved investigation reports remain in PostgreSQL. Fixed rules make evaluation repeatable, while optional model output remains nondeterministic. The code does not execute recommended remediation, access production systems, or replace on-call judgment.

MIT licensed. All evidence and incidents are synthetic.

### Browser contrast regression checks

Run `npx playwright install chromium` once, then `npm run test:browser`. CI checks rendered text contrast on desktop and mobile, including populated workflow states, using axe. Tests serve the built app under its repository subpath. These focused checks do not establish full accessibility conformance.

## Small improvement · November 7, 2026

Download a JSON investigation report with the scenario, execution mode, observations, hypotheses, next steps, and the exact evidence snapshot used for its references.

## Guided challenge · November 8, 2026

Start the guided backlog investigation, run the report, open two distinct evidence references, and choose a supported diagnosis. Incorrect answers provide evidence-based feedback. Changing scenarios or resetting exits the exercise; a new investigation clears its evidence-inspection progress. Offline mode uses fixtures; Compose uses local telemetry. Download the report to preserve the evidence and reasoning.

### Inline evidence inspection

Select a hypothesis’s evidence reference to open its measurement beside the reasoning. The inspector uses the report’s captured evidence snapshot, labels offline fixtures versus local telemetry, and explicitly identifies missing references. It does not make new telemetry or model requests. **Return to hypothesis** or Escape closes the inspector and restores keyboard focus to the reference. Changing scenarios, resetting, or generating a new report clears the preview. Desktop/mobile browser tests verify source contents, keyboard return, scenario isolation, and text contrast.

### Evidence counterfactual lab

Run an investigation, then choose **Test evidence** in the report toolbar. Withhold one or more captured signals, predict whether the deterministic rule result will change, and test the selection. The baseline and selected-evidence diagnoses show their supporting IDs and confidence labels. A supporting signal can be necessary even when another observation seems reassuring: withholding HTTP success from the queue scenario leaves the worker diagnosis intact, while withholding queue or worker evidence produces insufficient evidence.

This experiment runs in the browser in both deployment modes. For Compose it uses the report’s captured local telemetry; for Pages it uses offline fixtures. Both sides use the same transparent browser rules even when the original report came from an optional model. It never changes the original report, recollects telemetry, calls a model, or changes a service fault. Withholding an observation is not a recovery action, and rule confidence is not a calibrated probability. Unknown evidence types remain in the source snapshot but do not add unsupported rules.

Changing a selection clears its old result; restoring signals or running a new investigation resets the experiment. **Download comparison JSON** exports the captured evidence, included/excluded IDs, prediction, source report metadata, and both rule results with explicit experiment limitations. Unit tests cover necessary and non-supporting signals across all scenarios, empty evidence, traceable references, and snapshot isolation. Desktop/mobile browser tests cover predictions, stale-result clearing, exports, reset, new runs, and contrast.
