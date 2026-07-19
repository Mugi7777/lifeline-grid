import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NEEDS,
  VEHICLES,
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

test("the deterministic planner finds a zero-violation dispatch plan", () => {
  const plan = buildVerifiedPlan();
  const assignments = Object.fromEntries(
    plan.assignments.map((assignment) => [assignment.need.id, assignment.vehicle.id]),
  );

  assert.deepEqual(assignments, {
    clinic: "E-07",
    shelter: "E-32",
    water: "E-21",
  });
  assert.equal(plan.violationCount, 0);
  assert.equal(plan.unservedCriticalKwh, 0);
  assert.equal(plan.criticalSiteHours, 12);
  assert.equal(plan.allNeedsServed, true);
});

test("an East Bridge closure triggers a safe water-station reassignment", () => {
  const before = buildVerifiedPlan();
  const after = buildVerifiedPlan(["east-bridge"]);
  const beforeWater = before.assignments.find((assignment) => assignment.need.id === "water")!;
  const afterWater = after.assignments.find((assignment) => assignment.need.id === "water")!;

  assert.equal(beforeWater.vehicle.id, "E-21");
  assert.equal(afterWater.vehicle.id, "E-44");
  assert.equal(afterWater.route.routeId, "ridge-bypass");
  assert.equal(after.violationCount, 0);
  assert.equal(after.unservedCriticalKwh, 0);
});

test("the unsafe candidate is never dispatchable", () => {
  const plan = buildUnsafeCandidate();
  assert.equal(plan.allNeedsServed, false);
  assert.equal(plan.violationCount, 2);
});
