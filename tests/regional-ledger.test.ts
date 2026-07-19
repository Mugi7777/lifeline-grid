import assert from "node:assert/strict";
import test from "node:test";
import { REGIONAL_MODEL } from "../lib/regional.ts";
import { buildRegionalPlanResult, REGIONAL_PLAN_SCHEMA_VERSION } from "../lib/regional-contract.ts";
import {
  buildRegionalAuditEvent,
  buildRegionalRecordDigest,
  computeRegionalPlanDiff,
  normalizeRepairBudget,
  sanitizeScenarioLabel,
  verifyRegionalAuditChain,
  verifyRegionalRunBindings,
} from "../lib/regional-ledger.ts";

test("regional decision diff exposes lost access and changed routes", async () => {
  const baseline = await buildRegionalPlanResult({
    schemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
    model: REGIONAL_MODEL,
    closedRoadIds: [],
  });
  const disruption = await buildRegionalPlanResult({
    schemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
    model: REGIONAL_MODEL,
    closedRoadIds: ["center-north"],
  });
  const diff = computeRegionalPlanDiff(baseline, disruption);
  assert.equal(diff.baseline, false);
  assert.equal(diff.householdCoverageDelta, -15.3);
  assert.equal(diff.vulnerableCoverageDelta, -21.1);
  assert.equal(diff.criticalFailureDelta, 0);
  assert.deepEqual(diff.unservedAdded, ["d-north"]);
  assert.ok(diff.routeVehiclesChanged > 0);
});

test("regional audit chain verifies and detects a changed event", async () => {
  const first = await buildRegionalAuditEvent({
    runId: "run-00000000-0000-4000-8000-000000000000",
    sequence: 1,
    eventType: "created",
    actorEmail: "planner@example.jp",
    payloadDigest: "sha256:plan",
    previousHash: "GENESIS",
    createdAt: "2026-07-19T10:00:00.000Z",
  });
  const second = await buildRegionalAuditEvent({
    runId: first.runId,
    sequence: 2,
    eventType: "approved",
    actorEmail: "reviewer@example.jp",
    payloadDigest: "sha256:review",
    previousHash: first.eventHash,
    createdAt: "2026-07-19T10:01:00.000Z",
  });
  assert.equal(await verifyRegionalAuditChain([first, second]), true);
  assert.equal(await verifyRegionalAuditChain([first, { ...second, actorEmail: "attacker@example.jp" }]), false);
  assert.equal(await verifyRegionalAuditChain([]), false);
});

test("regional audit verification binds the event chain to the stored decision", async () => {
  const planRequest = {
    schemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
    model: REGIONAL_MODEL,
    closedRoadIds: [] as string[],
  };
  const planResult = await buildRegionalPlanResult(planRequest);
  const changeSummary = computeRegionalPlanDiff(null, planResult);
  const record = {
    ownerEmail: "planner@example.jp",
    status: "draft" as const,
    planRequest,
    planResult,
    scenarioLabel: "Synthetic baseline",
    repairBudgetM: 120,
    reviewerEmail: null,
    previousRunId: null,
    changeSummary,
    reviewDecision: null,
    reviewedBy: null,
    reviewComment: null,
  };
  const payloadDigest = await buildRegionalRecordDigest({
    planRequest,
    planResult,
    scenarioLabel: record.scenarioLabel,
    repairBudgetM: record.repairBudgetM,
    reviewerEmail: null,
    previousRunId: null,
    changeSummary,
  });
  const created = await buildRegionalAuditEvent({
    runId: "run-00000000-0000-4000-8000-000000000000",
    sequence: 1,
    eventType: "created",
    actorEmail: record.ownerEmail,
    payloadDigest,
    previousHash: "GENESIS",
    createdAt: "2026-07-19T10:00:00.000Z",
  });
  assert.equal(await verifyRegionalRunBindings(record, [created]), true);
  assert.equal(await verifyRegionalRunBindings({ ...record, scenarioLabel: "Edited after creation" }, [created]), false);
  assert.equal(await verifyRegionalRunBindings({ ...record, status: "approved" }, [created]), false);
});

test("ledger labels and budgets are normalized at the trust boundary", () => {
  assert.equal(sanitizeScenarioLabel("  North\n Forest\tRoad  ", "fallback"), "North Forest Road");
  assert.equal(sanitizeScenarioLabel("", "Baseline"), "Baseline");
  assert.equal(normalizeRepairBudget(120), 120);
  assert.equal(normalizeRepairBudget(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeRepairBudget(-1), null);
});
