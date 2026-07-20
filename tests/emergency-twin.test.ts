import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmergencyTwinEvidence,
  buildEmergencyTwinSnapshot,
  scalarKalmanFilter,
} from "../lib/emergency-twin.ts";
import { DEFAULT_NEEDS, buildVerifiedPlan } from "../lib/planner.ts";

const plan = buildVerifiedPlan([], DEFAULT_NEEDS);

test("the scalar Kalman estimator deterministically rejects measurement noise", () => {
  const measurements = [10.4, 9.8, 10.2, 9.9, 10.1];
  const first = scalarKalmanFilter(measurements, 10);
  const second = scalarKalmanFilter([...measurements], 10);
  assert.deepEqual(first, second);
  assert.ok(first.estimate > 9.9 && first.estimate < 10.15);
  assert.ok(first.variance < 1);
  assert.ok(first.gain > 0 && first.gain < 1);
});

test("the event-sourced twin replays the same state exactly", () => {
  const first = buildEmergencyTwinSnapshot(plan, 45, "nominal");
  const second = buildEmergencyTwinSnapshot(structuredClone(plan), 45, "nominal");
  assert.deepEqual(first, second);
  assert.equal(first.algorithm, "Event-sourced replay + scalar Kalman filter + deterministic 6h forecast");
  assert.equal(first.sourceCoveragePct, 100);
  assert.equal(first.trustState, "synchronized");
});

test("assigned assets move through geography and state instead of remaining static markers", () => {
  const start = buildEmergencyTwinSnapshot(plan, 0, "nominal");
  const later = buildEmergencyTwinSnapshot(plan, 45, "nominal");
  const startAsset = start.assets.find((asset) => asset.id === "E-21")!;
  const laterAsset = later.assets.find((asset) => asset.id === "E-21")!;
  assert.notDeepEqual(startAsset.estimatedCoordinate, laterAsset.estimatedCoordinate);
  assert.ok(laterAsset.estimatedSoc < startAsset.estimatedSoc);
  assert.equal(laterAsset.phase, "serving");
});

test("pump drift creates visible plan divergence and a six-hour critical gap", () => {
  const nominal = buildEmergencyTwinSnapshot(plan, 45, "nominal");
  const drift = buildEmergencyTwinSnapshot(plan, 45, "pump_drift");
  const nominalWater = nominal.facilities.find((facility) => facility.id === "water")!;
  const driftWater = drift.facilities.find((facility) => facility.id === "water")!;
  assert.ok(driftWater.estimatedLoadKw > nominalWater.estimatedLoadKw + 1);
  assert.equal(driftWater.forecastLoadKw, 6.5);
  assert.ok(drift.planDivergenceScore > nominal.planDivergenceScore);
  assert.ok(drift.projectedCriticalGapKwh > 0);
  assert.equal(drift.events.some((event) => event.id === "pump-drift"), true);
});

test("telemetry loss never disguises a stale observation as current state", () => {
  const nominal = buildEmergencyTwinSnapshot(plan, 50, "nominal");
  const lost = buildEmergencyTwinSnapshot(plan, 50, "telemetry_loss");
  const nominalAsset = nominal.assets.find((asset) => asset.id === "E-44")!;
  const lostAsset = lost.assets.find((asset) => asset.id === "E-44")!;
  const lostWater = lost.facilities.find((facility) => facility.id === "water")!;
  assert.equal(lost.sourceCoveragePct, 75);
  assert.equal(lost.trustState, "degraded");
  assert.equal(lostAsset.observedSoc, null);
  assert.equal(lostWater.observedLoadKw, null);
  assert.ok(lostAsset.uncertaintySocPoints > nominalAsset.uncertaintySocPoints);
  assert.ok(Number.isFinite(lostAsset.estimatedSoc));
});

test("conflicting road evidence is flagged without mutating or applying the plan", () => {
  const identityBefore = plan.assignments.map((assignment) => `${assignment.vehicle.id}/${assignment.route.routeId}`);
  const conflict = buildEmergencyTwinSnapshot(plan, 35, "bridge_conflict");
  const identityAfter = plan.assignments.map((assignment) => `${assignment.vehicle.id}/${assignment.route.routeId}`);
  assert.deepEqual(identityAfter, identityBefore);
  assert.equal(conflict.roads[0].state, "conflicting");
  assert.equal(conflict.roads[0].planningEffect, "not_applied");
  assert.equal(conflict.gates.worldAutoApplication, "prohibited");
  assert.equal(conflict.gates.fieldOperation, "blocked");
});

test("the twin evidence package is replayable and cannot grant field authority", async () => {
  const snapshot = buildEmergencyTwinSnapshot(plan, 50, "telemetry_loss");
  const first = await buildEmergencyTwinEvidence(snapshot, plan);
  const second = await buildEmergencyTwinEvidence(structuredClone(snapshot), structuredClone(plan));
  assert.deepEqual(first, second);
  assert.equal(first.claims.actuation, "none");
  assert.equal(first.gates.dispatch, "human_dual_control_required");
  assert.equal(first.gates.fieldOperation, "blocked");
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
});
