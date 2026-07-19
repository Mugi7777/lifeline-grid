import assert from "node:assert/strict";
import test from "node:test";

test("analysis endpoint exposes a transparent synthetic fallback without a secret", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reports: "Synthetic incident reports" }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, "demo-fallback");
  assert.equal(payload.model, "gpt-5.6");
  assert.equal(payload.needs.length, 3);
});

test("event endpoint converts the fictional bridge report into planner state without a secret", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `event-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report: "East Bridge is closed to all traffic." }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, "demo-fallback");
  assert.equal(payload.model, "gpt-5.6");
  assert.deepEqual(payload.event.blockedRouteIds, ["east-bridge"]);
});

test("regional event endpoint converts an inspection note into a supported road state", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `regional-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/api/regional-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report: "North Forest Road is closed pending inspection." }),
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.mode, "demo-fallback");
  assert.equal(payload.model, "gpt-5.6");
  assert.equal(payload.event.roadSegmentId, "center-north");
  assert.equal(payload.event.restriction, "closed");
});
