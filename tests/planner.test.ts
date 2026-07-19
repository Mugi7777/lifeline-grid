import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NEEDS,
  VEHICLES,
  buildGreedyBaseline,
  buildStressScenarios,
  buildUnsafeCandidate,
  buildVerifiedPlan,
  evaluateAssignment,
} from "../lib/planner.ts";

test("the attractive E-12 clinic candidate is blocked by two hard constraints", () => {
  const clinic = DEFAULT_NEEDS.find((need) => need.id === "clinic")!;
  const vehicle = VEHICLES.find((item) => item.id === "E-12")!;
  const assignment = evaluateAssignment(vehicle, clinic);

  assert.equal(assignment.safe, false);
  assert.deepEqual(
    assignment.checks.filter((check) => !check.pass).map((check) => check.code),
    ["duration", "reserve"],
  );
  assert.ok(assignment.postMissionSoc < vehicle.reserveSoc);
  assert.ok(assignment.coverageHours < clinic.durationHours);
});

test("the exact optimizer certifies a robust zero-violation dispatch plan", () => {
  const plan = buildVerifiedPlan();
  const assignments = Object.fromEntries(
    plan.assignments.map((assignment) => [assignment.need.id, assignment.vehicle.id]),
  );

  assert.deepEqual(assignments, {
    clinic: "E-07",
    shelter: "E-44",
    water: "E-21",
  });
  assert.equal(plan.violationCount, 0);
  assert.equal(plan.unservedCriticalKwh, 0);
  assert.equal(plan.criticalSiteHours, 12);
  assert.equal(plan.allNeedsServed, true);
  assert.equal(plan.optimization?.candidatePlans, 60);
  assert.equal(plan.optimization?.scenarioCount, 256);
  assert.equal(plan.optimization?.scenarioEvaluations, 15_360);
  assert.equal(plan.optimization?.optimized.successRate, 100);
  assert.ok((plan.optimization?.baseline.successRate ?? 100) < 100);
  assert.equal(plan.optimization?.optimalityCertified, true);
});

test("an East Bridge closure triggers a safe water-station reassignment", () => {
  const before = buildVerifiedPlan();
  const after = buildVerifiedPlan(["east-bridge"]);
  const beforeWater = before.assignments.find((assignment) => assignment.need.id === "water")!;
  const afterWater = after.assignments.find((assignment) => assignment.need.id === "water")!;

  assert.equal(beforeWater.vehicle.id, "E-21");
  assert.equal(afterWater.vehicle.id, "E-44");
  assert.equal(afterWater.route.routeId, "ridge-bypass");
  assert.equal(after.assignments.find((assignment) => assignment.need.id === "shelter")?.vehicle.id, "E-21");
  assert.equal(after.violationCount, 0);
  assert.equal(after.unservedCriticalKwh, 0);
  assert.equal(after.optimization?.optimized.successRate, 100);
});

test("the unsafe candidate is never dispatchable", () => {
  const plan = buildUnsafeCandidate();
  assert.equal(plan.allNeedsServed, false);
  assert.equal(plan.violationCount, 2);
});

test("the greedy baseline is nominally feasible but fragile under bounded uncertainty", () => {
  const baseline = buildGreedyBaseline();
  assert.equal(baseline.allNeedsServed, true);
  assert.equal(baseline.assignments.find((assignment) => assignment.need.id === "shelter")?.vehicle.id, "E-32");

  const optimized = buildVerifiedPlan();
  assert.ok((optimized.optimization?.baseline.violationScenarios ?? 0) > 0);
  assert.ok((optimized.optimization?.baseline.worstUnservedKwh ?? 0) > 0);
  assert.equal(optimized.optimization?.optimized.violationScenarios, 0);
});

test("the low-discrepancy stress suite is deterministic and remains inside declared bounds", () => {
  const first = buildStressScenarios(16);
  const second = buildStressScenarios(16);
  assert.deepEqual(first, second);
  assert.ok(first.every((scenario) => scenario.demandScale >= 0.9 && scenario.demandScale <= 1.1));
  assert.ok(first.every((scenario) => scenario.socDelta >= -5 && scenario.socDelta <= 5));
  assert.ok(first.every((scenario) => scenario.travelScale >= 0.8 && scenario.travelScale <= 1.2));
});
