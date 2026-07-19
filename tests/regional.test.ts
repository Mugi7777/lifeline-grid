import assert from "node:assert/strict";
import test from "node:test";
import {
  REGIONAL_MODEL,
  analyzeRegionalAccess,
  estimateRegionalExactSearch,
  planRegionalDelivery,
  solveRegionalDelivery,
  solveRegionalDeliveryScalable,
  validateRegionalModel,
  validateScalableRegionalModel,
  type RegionalModel,
} from "../lib/regional.ts";

function buildLargerModel(demandCount = 30): RegionalModel {
  const nodes = [
    { id: "hub", label: "Pilot hub", kind: "hub" as const, x: 0, y: 0 },
    ...Array.from({ length: demandCount }, (_, index) => ({
      id: `node-${index}`,
      label: `Community ${index}`,
      kind: "community" as const,
      x: index + 1,
      y: index % 5,
    })),
  ];
  return {
    district: "Deterministic scale benchmark · synthetic",
    nodes,
    roads: Array.from({ length: demandCount }, (_, index) => ({
      id: `road-${index}`,
      label: `Connector ${index}`,
      from: "hub",
      to: `node-${index}`,
      distanceKm: 1 + (index % 5) * 0.2,
      travelMinutes: 2 + (index % 3),
      conditionGrade: 2 as const,
      annualFailureProbability: 0.02,
      repairCostM: 10,
      weightLimitT: 8,
    })),
    demands: Array.from({ length: demandCount }, (_, index) => ({
      id: `demand-${index}`,
      nodeId: `node-${index}`,
      label: `Delivery ${index}`,
      households: 10,
      vulnerableResidents: index % 4,
      parcels: 3,
      coldParcels: 0,
      deadlineMinutes: 500,
      priority: index % 10 === 0 ? "critical" as const : "standard" as const,
    })),
    vehicles: Array.from({ length: 3 }, (_, index) => ({
      id: `vehicle-${index}`,
      label: `Vehicle ${index}`,
      operator: "Synthetic operator",
      depotNodeId: "hub",
      capacityParcels: 30,
      coldCapacity: 0,
      shiftMinutes: 500,
      weightT: 3,
      emissionsKgPerKm: 0.1,
      color: "#176b55",
    })),
  };
}

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

test("the scalable solver handles a 30-stop request without claiming optimality", () => {
  const model = buildLargerModel();
  assert.equal(validateRegionalModel(model).valid, false);
  assert.equal(validateScalableRegionalModel(model).valid, true);

  const plan = planRegionalDelivery(model);
  assert.equal(plan.algorithm, "Deterministic multi-start insertion VRPTW");
  assert.equal(plan.search.mode, "scalable-heuristic");
  assert.equal(plan.search.starts, 3);
  assert.equal(plan.search.deterministic, true);
  assert.equal(plan.optimalityCertified, false);
  assert.equal(plan.search.optimalityGap, null);
  assert.equal(plan.metrics.serviceCoveragePercent, 100);
  assert.equal(plan.metrics.criticalFailures, 0);
  assert.ok(plan.search.candidatesEvaluated > 0);
});

test("scalable planning is deterministic and preserves every hard vehicle limit", () => {
  const model = buildLargerModel();
  const first = solveRegionalDeliveryScalable(model);
  const second = solveRegionalDeliveryScalable(model);
  assert.deepEqual(first, second);
  for (const route of first.routes) {
    assert.ok(route.parcels <= route.vehicle.capacityParcels);
    assert.ok(route.coldParcels <= route.vehicle.coldCapacity);
    assert.ok(route.totalMinutes <= route.vehicle.shiftMinutes);
  }
});

test("bounded scalable validation rejects oversized and non-finite requests", () => {
  const oversized = buildLargerModel(251);
  assert.match(validateScalableRegionalModel(oversized).errors.join(" "), /at most 250 demands/);

  const nonFinite = buildLargerModel();
  nonFinite.roads[0].travelMinutes = Number.POSITIVE_INFINITY;
  assert.match(validateScalableRegionalModel(nonFinite).errors.join(" "), /non-finite/);
});

test("exact search is rejected when vehicle combinations would explode", () => {
  const model = buildLargerModel(8);
  model.vehicles = Array.from({ length: 20 }, (_, index) => ({
    ...model.vehicles[index % model.vehicles.length],
    id: `expanded-vehicle-${index}`,
  }));
  assert.equal(estimateRegionalExactSearch(model).withinBudget, false);
  assert.match(validateRegionalModel(model).errors.join(" "), /search budget exceeded/);
  assert.throws(() => solveRegionalDelivery(model), /search budget exceeded/);
  assert.equal(planRegionalDelivery(model).search.mode, "scalable-heuristic");
});
