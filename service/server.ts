import Fastify from "fastify";
import pg from "pg";
const app = Fastify({ logger: true });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 150,
});
let scenario = "deployment",
  requests = 0,
  errors = 0,
  processed = 0;
let queue: number[] = [];
let held: pg.PoolClient[] = [];
let generation = 0;
let sampling = false;
app.get("/health", async () => ({ ok: true }));
app.get("/work", async (_, reply) => {
  requests++;
  if (scenario === "deployment" && requests % 3 !== 0) {
    errors++;
    return reply.code(500).send({ error: "v2.4 handler regression" });
  }
  try {
    const c = await pool.connect();
    try {
      await c.query("SELECT 1");
    } finally {
      c.release();
    }
    return { ok: true };
  } catch {
    errors++;
    return reply.code(503).send({ error: "connection acquisition timeout" });
  }
});
app.post<{ Body: { scenario: string } }>("/fault", async (req, reply) => {
  if (!["deployment", "pool", "queue"].includes(req.body?.scenario))
    return reply.code(400).send({ error: "Unknown scenario" });
  generation++;
  held.forEach((c) => c.release());
  held = [];
  scenario = req.body.scenario;
  requests = 0;
  errors = 0;
  processed = 0;
  queue = [];
  if (scenario === "pool") {
    for (let i = 0; i < 4; i++) held.push(await pool.connect());
  }
  if (scenario === "queue") queue = Array.from({ length: 20 }, (_, i) => i);
  return { scenario };
});
setInterval(() => {
  if (scenario === "queue" && queue.length) {
    queue.shift();
    processed++;
  }
}, 5000).unref();
app.get("/evidence", async (_, reply) => {
  if (sampling)
    return reply
      .code(409)
      .send({ error: "A sample is already in progress; retry." });
  sampling = true;
  const g = generation;
  try {
    const before = errors;
    for (let i = 0; i < 12; i++)
      await app.inject({ method: "GET", url: "/work" });
    if (g !== generation)
      return reply
        .code(409)
        .send({ error: "Scenario changed during sampling; retry." });
    const e = [
      {
        id: "deploy-1",
        kind: "deployment",
        summary:
          scenario === "deployment"
            ? "Release v2.4 preceded this sample"
            : "No recent deployment",
        value: scenario === "deployment" ? 1 : 0,
      },
      {
        id: "http-1",
        kind: "errors",
        summary: `${errors - before} of 12 real handler requests failed`,
        value: errors - before,
      },
      {
        id: "pool-1",
        kind: "pool",
        summary: `${held.length} of 4 PostgreSQL connections deliberately held`,
        value: held.length,
      },
    ];
    if (scenario === "queue") {
      queue.push(...Array.from({ length: 20 }, (_, i) => i));
      e.push(
        {
          id: "queue-1",
          kind: "queue",
          summary: `${queue.length} jobs queued after adding a 20-job burst`,
          value: queue.length,
        },
        {
          id: "worker-1",
          kind: "worker",
          summary: `Worker capacity: 1 job every 5 seconds; ${processed} completed`,
          value: 1,
        },
      );
    }
    return { scenario, evidence: e };
  } finally {
    sampling = false;
  }
});
await pool.query("SELECT 1");
await app.listen({ host: "0.0.0.0", port: 3001 });
