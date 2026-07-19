import { performance } from "node:perf_hooks";
import { solveRegionalDeliveryScalable, type RegionalModel } from "../lib/regional.ts";

const requestedSize = Number(process.argv[2] ?? 100);
if (!Number.isInteger(requestedSize) || requestedSize < 11 || requestedSize > 250) {
  throw new Error("Benchmark size must be an integer between 11 and 250");
}

function buildBenchmarkModel(demandCount: number): RegionalModel {
  const vehicleCount = Math.ceil(demandCount / 10);
  return {
    district: `${demandCount}-stop benchmark · synthetic`,
    nodes: [
      { id: "hub", label: "Benchmark hub", kind: "hub", x: 0, y: 0 },
      ...Array.from({ length: demandCount }, (_, index) => ({
        id: `node-${index}`,
        label: `Community ${index}`,
        kind: "community" as const,
        x: index + 1,
        y: index % 10,
      })),
    ],
    roads: Array.from({ length: demandCount }, (_, index) => ({
      id: `road-${index}`,
      label: `Connector ${index}`,
      from: "hub",
      to: `node-${index}`,
      distanceKm: 1 + (index % 7) * 0.1,
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
      deadlineMinutes: 1_000,
      priority: index % 20 === 0 ? "critical" as const : "standard" as const,
    })),
    vehicles: Array.from({ length: vehicleCount }, (_, index) => ({
      id: `vehicle-${index}`,
      label: `Vehicle ${index}`,
      operator: "Synthetic benchmark operator",
      depotNodeId: "hub",
      capacityParcels: 30,
      coldCapacity: 0,
      shiftMinutes: 1_000,
      weightT: 3,
      emissionsKgPerKm: 0.1,
      color: "#176b55",
    })),
  };
}

const model = buildBenchmarkModel(requestedSize);
const startedAt = performance.now();
const plan = solveRegionalDeliveryScalable(model);
const elapsedMs = Number((performance.now() - startedAt).toFixed(1));

console.log(JSON.stringify({
  fixture: model.district,
  elapsedMs,
  demandCount: model.demands.length,
  vehicleCount: model.vehicles.length,
  candidatesEvaluated: plan.search.candidatesEvaluated,
  feasibleCandidates: plan.search.feasibleCandidates,
  serviceCoveragePercent: plan.metrics.serviceCoveragePercent,
  criticalFailures: plan.metrics.criticalFailures,
  optimalityCertified: plan.optimalityCertified,
}, null, 2));
