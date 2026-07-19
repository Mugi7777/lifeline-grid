import assert from "node:assert/strict";
import test from "node:test";
import { analyzeNankaiResponse, buildNankaiEvidence } from "../lib/nankai-response.ts";

test("the first-six-hour Nankai fixture reproduces a bounded multi-modal response", () => {
  const analysis = analyzeNankaiResponse("first_6_hours");
  assert.deepEqual(analysis.metrics, {
    supplyCoveragePercent: 50.2,
    powerCriticalGaps: 1,
    medicalCasesPlanned: 0,
    medicalAirRequests: 5,
    droneZonesCovered: 3,
    inaccessibleLocations: 3,
  });
  assert.equal(analysis.clearancePriorities[0].road.id, "airbase-coastal");
  assert.equal(analysis.supply.commodities.find((item) => item.commodity === "medicine_kits")?.deliveredUnits, 26);
  assert.deepEqual(analysis.drone.assignments.map((item) => item.zoneId), [
    "coastal-hospital-perimeter",
    "mountain-slope-grid",
    "central-lowland-grid",
  ]);
  assert.equal(analysis.gates.fieldOperation, "blocked");
  assert.equal(analysis.gates.autonomousDispatch, "prohibited");
  assert.equal(analysis.gates.medicalAndAirTasking, "human_authority_required");
});

test("the top clearance counterfactual restores power and supply without claiming authority", () => {
  const baseline = analyzeNankaiResponse("first_6_hours");
  const intervention = analyzeNankaiResponse("first_6_hours", baseline.clearancePriorities[0].road.id);
  assert.equal(intervention.interventionRoadId, "airbase-coastal");
  assert.ok(intervention.metrics.supplyCoveragePercent > baseline.metrics.supplyCoveragePercent);
  assert.ok(intervention.metrics.inaccessibleLocations < baseline.metrics.inaccessibleLocations);
  assert.equal(intervention.metrics.powerCriticalGaps, 0);
  assert.equal(intervention.gates.fieldOperation, "blocked");
});

test("modeled recovery improves access across the 24 and 72 hour phases", () => {
  const first = analyzeNankaiResponse("first_6_hours");
  const dayOne = analyzeNankaiResponse("hour_24");
  const dayThree = analyzeNankaiResponse("hour_72");
  assert.deepEqual([first.metrics.inaccessibleLocations, dayOne.metrics.inaccessibleLocations, dayThree.metrics.inaccessibleLocations], [3, 1, 0]);
  assert.deepEqual([first.metrics.medicalCasesPlanned, dayOne.metrics.medicalCasesPlanned, dayThree.metrics.medicalCasesPlanned], [0, 2, 3]);
  assert.ok(first.metrics.supplyCoveragePercent < dayOne.metrics.supplyCoveragePercent);
  assert.ok(dayOne.metrics.supplyCoveragePercent < dayThree.metrics.supplyCoveragePercent);
  assert.equal(dayThree.metrics.powerCriticalGaps, 0);
});

test("no computed ground route traverses a blocked or unknown corridor", () => {
  const analysis = analyzeNankaiResponse("first_6_hours", "hospital-central");
  const stateByRoad = new Map(analysis.roads.map((road) => [road.id, road.activeState]));
  const usedRoadIds = [
    ...analysis.supply.commodities.flatMap((commodity) => commodity.assignments.flatMap((assignment) => assignment.route.roadIds)),
    ...analysis.power.assignments.flatMap((assignment) => assignment.route.roadIds),
    ...analysis.medical.groundAssignments.flatMap((assignment) => assignment.roadIds),
  ];
  assert.ok(usedRoadIds.length > 0);
  for (const roadId of usedRoadIds) assert.ok(stateByRoad.get(roadId) === "open" || stateByRoad.get(roadId) === "degraded", roadId);
});

test("exact assignment evidence and exported digest are deterministic", async () => {
  const first = analyzeNankaiResponse("hour_24");
  const second = analyzeNankaiResponse("hour_24");
  assert.deepEqual(first, second);
  assert.ok(first.evidence.exactPowerAssignments > 0);
  assert.ok(first.evidence.exactMedicalAssignments > 0);
  assert.ok(first.evidence.exactDroneAssignments > 0);
  assert.ok(first.evidence.minCostFlowAugmentations > 0);
  const firstEvidence = await buildNankaiEvidence(first);
  const secondEvidence = await buildNankaiEvidence(second);
  assert.deepEqual(firstEvidence, secondEvidence);
  assert.match(firstEvidence.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
});

test("unsupported phases and invented interventions fail closed", () => {
  assert.throws(() => analyzeNankaiResponse("hour_99" as never), /Unsupported response phase/);
  assert.throws(() => analyzeNankaiResponse("first_6_hours", "invented-road"), /Unknown road-clearance intervention/);
});
