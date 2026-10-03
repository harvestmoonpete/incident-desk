export type Scenario = "deployment" | "pool" | "queue";
export interface Evidence {
  id: string;
  kind: string;
  summary: string;
  value: number;
}
export interface Hypothesis {
  title: string;
  confidence: string;
  evidence_ids: string[];
  reasoning: string;
}
export interface Report {
  id: string;
  mode: string;
  evidence?: Evidence[];
  observations: string[];
  hypotheses: Hypothesis[];
  next_steps: string[];
}
export interface Snapshot {
  scenario: Scenario;
  evidence: Evidence[];
}
export interface Desk {
  snapshot(): Promise<Snapshot>;
  select(s: Scenario): Promise<Snapshot>;
  reset(): Promise<Snapshot>;
  investigate(mode: string): Promise<Report>;
}
export const scenarios: Record<
  Scenario,
  { name: string; subtitle: string; icon: string }
> = {
  deployment: {
    name: "A deployment goes wrong",
    subtitle: "Elevated errors after release v2.4",
    icon: "01",
  },
  pool: {
    name: "No connections left",
    subtitle: "Requests wait for database capacity",
    icon: "02",
  },
  queue: {
    name: "Work is piling up",
    subtitle: "Incoming jobs outpace the worker",
    icon: "03",
  },
};
export const fixtures: Record<Scenario, Evidence[]> = {
  deployment: [
    {
      id: "deploy-1",
      kind: "deployment",
      summary: "Release v2.4 preceded the error spike",
      value: 1,
    },
    {
      id: "http-1",
      kind: "errors",
      summary: "8 of 12 sample requests returned HTTP 500",
      value: 8,
    },
    {
      id: "pool-1",
      kind: "pool",
      summary: "Database capacity remains available",
      value: 0,
    },
  ],
  pool: [
    {
      id: "pool-1",
      kind: "pool",
      summary: "All 4 database connection slots are held",
      value: 4,
    },
    {
      id: "http-1",
      kind: "errors",
      summary: "8 requests could not acquire a connection",
      value: 8,
    },
    {
      id: "deploy-1",
      kind: "deployment",
      summary: "No recent deployment",
      value: 0,
    },
  ],
  queue: [
    {
      id: "queue-1",
      kind: "queue",
      summary: "18 jobs await a single worker",
      value: 18,
    },
    {
      id: "worker-1",
      kind: "worker",
      summary: "Worker completes 1 job per sample",
      value: 1,
    },
    {
      id: "http-1",
      kind: "errors",
      summary: "HTTP requests remain successful",
      value: 0,
    },
  ],
};
export function diagnose(evidence: Evidence[], id = "offline-report"): Report {
  const find = (id: string) => evidence.find((e) => e.id === id);
  const hs: Hypothesis[] = [];
  if ((find("deploy-1")?.value ?? 0) > 0 && (find("http-1")?.value ?? 0) > 0)
    hs.push({
      title: "Deployment regression",
      confidence: "high",
      evidence_ids: ["deploy-1", "http-1"],
      reasoning:
        "A release and failing requests occur together. Compare the deployed handler with the previous version before rollback.",
    });
  if ((find("pool-1")?.value ?? 0) >= 4 && (find("http-1")?.value ?? 0) > 0)
    hs.push({
      title: "Database connection exhaustion",
      confidence: "high",
      evidence_ids: ["pool-1", "http-1"],
      reasoning:
        "The connection pool is full while requests fail to acquire a slot.",
    });
  if ((find("queue-1")?.value ?? 0) >= 5 && (find("worker-1")?.value ?? 0) > 0)
    hs.push({
      title: "Worker throughput deficit",
      confidence: "high",
      evidence_ids: ["queue-1", "worker-1"],
      reasoning:
        "A growing backlog with a slow active worker indicates arrival rate exceeds processing capacity.",
    });
  if (!hs.length)
    hs.push({
      title: "Insufficient evidence",
      confidence: "low",
      evidence_ids: [],
      reasoning:
        "Collect deployment, error, pool and worker measurements before attributing a cause.",
    });
  return {
    id,
    mode: "offline rules",
    observations: evidence.map((e) => e.summary),
    hypotheses: hs,
    next_steps: [
      "Reproduce the suspected fault in an isolated environment.",
      "Apply a targeted recovery, then compare the same measurements.",
      "Preserve this evidence with the incident record.",
    ],
  };
}
export class BrowserDesk implements Desk {
  private scenario: Scenario = "deployment";
  async snapshot() {
    return {
      scenario: this.scenario,
      evidence: structuredClone(fixtures[this.scenario]),
    };
  }
  async select(s: Scenario) {
    this.scenario = s;
    return this.snapshot();
  }
  async reset() {
    this.scenario = "deployment";
    return this.snapshot();
  }
  async investigate() {
    return diagnose((await this.snapshot()).evidence);
  }
}
class HttpDesk implements Desk {
  private async call<T>(path: string, body?: unknown): Promise<T> {
    const r = await fetch("/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({ detail: r.statusText }));
      throw Error(
        typeof e.detail === "string"
          ? e.detail
          : "Request failed. Check the service and retry.",
      );
    }
    return r.json();
  }
  snapshot() {
    return this.call<Snapshot>("/evidence");
  }
  select(s: Scenario) {
    return this.call<Snapshot>("/scenario", { scenario: s });
  }
  reset() {
    return this.call<Snapshot>("/reset", {});
  }
  investigate(mode: string) {
    return this.call<Report>("/investigations", { mode });
  }
}
export const live = import.meta.env?.VITE_MODE === "live";
export const desk: Desk = live ? new HttpDesk() : new BrowserDesk();
