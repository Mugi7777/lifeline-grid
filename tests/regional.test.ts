import assert from "node:assert/strict";
import test from "node:test";
import {
  REGIONAL_MODEL,
  analyzeRegionalAccess,
  solveRegionalDelivery,
  validateRegionalModel,
} from "../lib/regional.ts";

test("the regional exact optimizer covers every household and critical deadline", () => {
  const analysis = analyzeRegionalAccess();

  assert.equal(analysis.activePlan.algorithm, "Exact pooled heterogeneous VRPTW");
  assert.equal(analysis.activePlan.candidateAssignments, 4_096);
  assert.equal(analysis.activePlan.optimalityCertified, true);
  assert.equal(analysis.activePlan.metrics.serviceCoveragePercent, 100);
  assert.equal(analysis.activePlan.metrics.vulnerableCoveragePercent, 100);
  assert.equal(analysis.activePlan.metrics.criticalFailures, 0);
  assert.deepEqual(analysis.activePlan.metrics.unservedDemandIds, []);
  assert.deepEqual(analysis.activePlan.metrics.lateDemandIds, []);
  assert.equal(analysis.stress.scenarioCount, 64);
  assert.equal(analysis.stress.criticalServiceSuccessRate, 100);
});

test("a single North Forest Road loss exposes service impact hidden by condition alone", () => {
  const baseline = analyzeRegionalAccess();
  const failed = analyzeRegionalAccess("center-north");

  assert.equal(baseline.roadCriticality[0].road.id, "center-north");
  assert.equal(failed.activePlan.metrics.serviceCoveragePercent, 84.7);
  assert.equal(failed.activePlan.metrics.vulnerableCoveragePercent, 78.9);
  assert.deepEqual(failed.activePlan.metrics.unservedDemandIds, ["d-north"]);
  assert.equal(failed.stress.fullServiceSuccessRate, 0);
  assert.equal(failed.stress.criticalServiceSuccessRate, 100);
});

test("every regional route respects capacity, cold-chain, shift and road limits", () => {
  const plan = solveRegionalDelivery();
  for (const route of plan.routes) {
    assert.ok(route.parcels <= route.vehicle.capacityParcels);
    assert.ok(route.coldParcels <= route.vehicle.coldCapacity);
    assert.ok(route.totalMinutes <= route.vehicle.shiftMinutes);
    for (const roadId of route.usedRoadSegmentIds) {
      const road = REGIONAL_MODEL.roads.find((item) => item.id === roadId)!;
      assert.ok(route.vehicle.weightT <= road.weightLimitT);
    }
  }
});

test("the exact repair portfolio never exceeds budget and more budget cannot reduce benefit", () => {
  const constrained = analyzeRegionalAccess(null, 80).repairPortfolio;
  const expanded = analyzeRegionalAccess(null, 160).repairPortfolio;

  assert.ok(constrained.costM <= constrained.budgetM);
  assert.ok(expanded.costM <= expanded.budgetM);
  assert.ok(expanded.expectedRiskReduction >= constrained.expectedRiskReduction);
  assert.equal(constrained.optimalityCertified, true);
  assert.equal(expanded.optimalityCertified, true);
});

test("regional analysis is deterministic for audit replay", () => {
  const first = analyzeRegionalAccess("center-clinic", 130);
  const second = analyzeRegionalAccess("center-clinic", 130);

  assert.deepEqual(first, second);
});

test("invalid topology and oversized exact models fail closed", () => {
  const broken = structuredClone(REGIONAL_MODEL);
  broken.roads[0].to = "missing-node";
  const invalidTopology = validateRegionalModel(broken);
  assert.equal(invalidTopology.valid, false);
  assert.match(invalidTopology.errors.join(" "), /unknown node/);
  assert.throws(() => solveRegionalDelivery(broken), /Invalid regional model/);

  const oversized = structuredClone(REGIONAL_MODEL);
  while (oversized.demands.length <= 10) {
    const index = oversized.demands.length;
    oversized.demands.push({ ...oversized.demands[0], id: `extra-${index}` });
  }
  assert.equal(validateRegionalModel(oversized).valid, false);
  assert.throws(() => solveRegionalDelivery(oversized), /at most 10 demands/);
});
