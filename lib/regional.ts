export type RegionalPriority = "critical" | "essential" | "standard";

export interface RegionalNode {
  id: string;
  label: string;
  kind: "hub" | "community" | "clinic";
  x: number;
  y: number;
}

export interface RoadSegment {
  id: string;
  label: string;
  from: string;
  to: string;
  distanceKm: number;
  travelMinutes: number;
  conditionGrade: 1 | 2 | 3 | 4 | 5;
  annualFailureProbability: number;
  repairCostM: number;
  weightLimitT: number;
}

export interface RegionalDemand {
  id: string;
  nodeId: string;
  label: string;
  households: number;
  vulnerableResidents: number;
  parcels: number;
  coldParcels: number;
  deadlineMinutes: number;
  priority: RegionalPriority;
}

export interface RegionalVehicle {
  id: string;
  label: string;
  operator: string;
  depotNodeId: string;
  capacityParcels: number;
  coldCapacity: number;
  shiftMinutes: number;
  weightT: number;
  emissionsKgPerKm: number;
  color: string;
}

export interface RegionalModel {
  district: string;
  nodes: RegionalNode[];
  roads: RoadSegment[];
  demands: RegionalDemand[];
  vehicles: RegionalVehicle[];
}

export interface RouteStop {
  demandId: string;
  label: string;
  arrivalMinutes: number;
  deadlineMinutes: number;
  onTime: boolean;
}

export interface RegionalVehicleRoute {
  vehicle: RegionalVehicle;
  stops: RouteStop[];
  demandIds: string[];
  distanceKm: number;
  totalMinutes: number;
  parcels: number;
  coldParcels: number;
  emissionsKg: number;
  usedRoadSegmentIds: string[];
}

export interface RegionalPlanMetrics {
  serviceCoveragePercent: number;
  vulnerableCoveragePercent: number;
  householdsCovered: number;
  vulnerableResidentsCovered: number;
  parcelsDeliveredOnTime: number;
  totalDistanceKm: number;
  totalMinutes: number;
  emissionsKg: number;
  unservedDemandIds: string[];
  lateDemandIds: string[];
  criticalFailures: number;
}

export interface RegionalDeliveryPlan {
  algorithm: "Exact pooled heterogeneous VRPTW" | "Deterministic multi-start insertion VRPTW";
  routes: RegionalVehicleRoute[];
  metrics: RegionalPlanMetrics;
  candidateAssignments: number;
  feasibleAssignments: number;
  optimalityCertified: boolean;
  search: {
    mode: "exact" | "scalable-heuristic";
    deterministic: true;
    starts: number;
    candidatesEvaluated: number;
    feasibleCandidates: number;
    optimalityGap: number | null;
  };
}

export interface RoadCriticality {
  road: RoadSegment;
  rank: number;
  serviceImpact: number;
  expectedAnnualRisk: number;
  vulnerableResidentsAtRisk: number;
  householdsAtRisk: number;
  parcelsAtRisk: number;
  addedVehicleMinutes: number;
  criticalFailures: number;
  closurePlan: RegionalDeliveryPlan;
}

export interface RepairPortfolio {
  budgetM: number;
  selectedRoads: RoadCriticality[];
  costM: number;
  expectedRiskReduction: number;
  riskReductionPercent: number;
  portfoliosEvaluated: number;
  optimalityCertified: boolean;
}

export interface RegionalStressResult {
  scenarioCount: number;
  fullServiceSuccessRate: number;
  criticalServiceSuccessRate: number;
  worstCapacityOverrunParcels: number;
  worstLateMinutes: number;
}

export interface RegionalAnalysis {
  model: RegionalModel;
  closedSegmentId: string | null;
  baseline: RegionalDeliveryPlan;
  activePlan: RegionalDeliveryPlan;
  roadCriticality: RoadCriticality[];
  repairPortfolio: RepairPortfolio;
  stress: RegionalStressResult;
  singleStopBaselineKm: number;
  pooledDistanceSavingPercent: number;
  evidence: {
    algorithm: "Regional access twin: exact VRPTW + N-1 road graph + exact repair knapsack";
    deliveryCandidateAssignments: number;
    nMinusOneRoadCases: number;
    repairPortfoliosEvaluated: number;
    stressScenarios: number;
  };
}

export interface RegionalModelValidation {
  valid: boolean;
  errors: string[];
}

interface GraphLeg {
  distanceKm: number;
  travelMinutes: number;
  roadIds: string[];
}

interface CandidateRoute extends RegionalVehicleRoute {
  lateCritical: number;
  lateStops: number;
}

const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const defaultPlanCache = new Map<string, RegionalDeliveryPlan>();
const EXACT_ASSIGNMENT_LIMIT = 1_000_000;
const EXACT_ROUTE_ORDER_LIMIT = 2_000_000;

export function estimateRegionalExactSearch(model: Pick<RegionalModel, "demands" | "vehicles">) {
  const demandCount = model.demands.length;
  const assignmentCandidates = (model.vehicles.length + 1) ** demandCount;
  let routeOrdersPerVehicle = 1;
  let partialPermutation = 1;
  for (let size = 1; size <= demandCount; size += 1) {
    partialPermutation *= demandCount - size + 1;
    routeOrdersPerVehicle += partialPermutation;
  }
  const routeOrderCandidates = routeOrdersPerVehicle * model.vehicles.length;
  return {
    assignmentCandidates,
    routeOrderCandidates,
    withinBudget: assignmentCandidates <= EXACT_ASSIGNMENT_LIMIT && routeOrderCandidates <= EXACT_ROUTE_ORDER_LIMIT,
    limits: {
      assignmentCandidates: EXACT_ASSIGNMENT_LIMIT,
      routeOrderCandidates: EXACT_ROUTE_ORDER_LIMIT,
    },
  };
}

export function validateRegionalModel(
  model: RegionalModel,
  options: { maxDemands?: number; solverLabel?: string; enforceExactSearchBudget?: boolean } = {},
): RegionalModelValidation {
  const errors: string[] = [];
  const maxDemands = options.maxDemands ?? 10;
  const solverLabel = options.solverLabel ?? "the inspectable exact solver";
  const duplicateIds = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  const finite = (values: number[]) => values.every(Number.isFinite);
  const validId = (value: string) => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const roadIds = model.roads.map((road) => road.id);
  const demandIds = model.demands.map((demand) => demand.id);
  const vehicleIds = model.vehicles.map((vehicle) => vehicle.id);

  if (!model.district.trim() || model.district.length > 160) errors.push("district is required and must be at most 160 characters");
  if (model.nodes.length < 2) errors.push("at least two nodes are required");
  if (model.nodes.length > 500) errors.push("at most 500 nodes are accepted per planning request");
  if (model.roads.length < 1) errors.push("at least one road is required");
  if (model.roads.length > 2_000) errors.push("at most 2,000 roads are accepted per planning request");
  if (model.demands.length < 1) errors.push("at least one demand is required");
  if (model.demands.length > maxDemands) errors.push(`${solverLabel} accepts at most ${maxDemands} demands`);
  if (model.vehicles.length < 1) errors.push("at least one vehicle is required");
  if (model.vehicles.length > 100) errors.push("at most 100 vehicles are accepted per planning request");
  if ((options.enforceExactSearchBudget ?? true) && model.demands.length <= maxDemands) {
    const estimate = estimateRegionalExactSearch(model);
    if (!estimate.withinBudget) {
      errors.push(`${solverLabel} search budget exceeded; use the bounded scalable solver`);
    }
  }
  for (const id of duplicateIds(model.nodes.map((node) => node.id))) errors.push(`duplicate node id: ${id}`);
  for (const id of duplicateIds(roadIds)) errors.push(`duplicate road id: ${id}`);
  for (const id of duplicateIds(demandIds)) errors.push(`duplicate demand id: ${id}`);
  for (const id of duplicateIds(vehicleIds)) errors.push(`duplicate vehicle id: ${id}`);

  for (const node of model.nodes) {
    if (!validId(node.id)) errors.push(`node id is invalid: ${node.id}`);
    if (!node.label.trim() || node.label.length > 160) errors.push(`node ${node.id} has an invalid label`);
    if (!["hub", "community", "clinic"].includes(node.kind)) errors.push(`node ${node.id} has an invalid kind`);
    if (!finite([node.x, node.y])) errors.push(`node ${node.id} contains a non-finite coordinate`);
  }

  for (const road of model.roads) {
    if (!validId(road.id)) errors.push(`road id is invalid: ${road.id}`);
    if (!road.label.trim() || road.label.length > 160) errors.push(`road ${road.id} has an invalid label`);
    if (!nodeIds.has(road.from) || !nodeIds.has(road.to)) errors.push(`road ${road.id} references an unknown node`);
    if (road.from === road.to) errors.push(`road ${road.id} must connect two different nodes`);
    if (!finite([road.distanceKm, road.travelMinutes, road.annualFailureProbability, road.repairCostM, road.weightLimitT])) errors.push(`road ${road.id} contains a non-finite number`);
    if (!Number.isInteger(road.conditionGrade) || road.conditionGrade < 1 || road.conditionGrade > 5) errors.push(`road ${road.id} has an invalid condition grade`);
    if (road.distanceKm <= 0 || road.travelMinutes <= 0) errors.push(`road ${road.id} requires positive distance and travel time`);
    if (road.distanceKm > 1_000_000 || road.travelMinutes > 1_000_000 || road.repairCostM > 1_000_000_000_000 || road.weightLimitT > 10_000) errors.push(`road ${road.id} exceeds a bounded numeric limit`);
    if (road.annualFailureProbability < 0 || road.annualFailureProbability > 1) errors.push(`road ${road.id} failure probability must be between 0 and 1`);
    if (road.repairCostM < 0 || road.weightLimitT <= 0) errors.push(`road ${road.id} has invalid repair cost or weight limit`);
  }
  for (const demand of model.demands) {
    if (!validId(demand.id)) errors.push(`demand id is invalid: ${demand.id}`);
    if (!demand.label.trim() || demand.label.length > 160) errors.push(`demand ${demand.id} has an invalid label`);
    if (!nodeIds.has(demand.nodeId)) errors.push(`demand ${demand.id} references an unknown node`);
    if (!finite([demand.households, demand.vulnerableResidents, demand.parcels, demand.coldParcels, demand.deadlineMinutes])) errors.push(`demand ${demand.id} contains a non-finite number`);
    if (!["critical", "essential", "standard"].includes(demand.priority)) errors.push(`demand ${demand.id} has an invalid priority`);
    if (![demand.households, demand.vulnerableResidents, demand.parcels, demand.coldParcels].every(Number.isInteger)) errors.push(`demand ${demand.id} quantities must be integers`);
    if (demand.households < 0 || demand.vulnerableResidents < 0 || demand.parcels < 0 || demand.coldParcels < 0) errors.push(`demand ${demand.id} contains a negative quantity`);
    if (demand.households > 1_000_000_000 || demand.vulnerableResidents > 1_000_000_000 || demand.parcels > 1_000_000_000 || demand.deadlineMinutes > 10_000_000) errors.push(`demand ${demand.id} exceeds a bounded numeric limit`);
    if (demand.coldParcels > demand.parcels) errors.push(`demand ${demand.id} cold parcels exceed total parcels`);
    if (demand.deadlineMinutes <= 0) errors.push(`demand ${demand.id} requires a positive deadline`);
  }
  for (const vehicle of model.vehicles) {
    if (!validId(vehicle.id)) errors.push(`vehicle id is invalid: ${vehicle.id}`);
    if (!vehicle.label.trim() || vehicle.label.length > 160 || !vehicle.operator.trim() || vehicle.operator.length > 160) errors.push(`vehicle ${vehicle.id} has an invalid label or operator`);
    if (!nodeIds.has(vehicle.depotNodeId)) errors.push(`vehicle ${vehicle.id} references an unknown depot`);
    if (!finite([vehicle.capacityParcels, vehicle.coldCapacity, vehicle.shiftMinutes, vehicle.weightT, vehicle.emissionsKgPerKm])) errors.push(`vehicle ${vehicle.id} contains a non-finite number`);
    if (!Number.isInteger(vehicle.capacityParcels) || !Number.isInteger(vehicle.coldCapacity)) errors.push(`vehicle ${vehicle.id} capacities must be integers`);
    if (vehicle.capacityParcels <= 0 || vehicle.coldCapacity < 0 || vehicle.shiftMinutes <= 0 || vehicle.weightT <= 0) errors.push(`vehicle ${vehicle.id} contains an invalid hard limit`);
    if (vehicle.capacityParcels > 1_000_000_000 || vehicle.shiftMinutes > 10_000_000 || vehicle.weightT > 10_000 || vehicle.emissionsKgPerKm > 1_000_000) errors.push(`vehicle ${vehicle.id} exceeds a bounded numeric limit`);
    if (vehicle.coldCapacity > vehicle.capacityParcels) errors.push(`vehicle ${vehicle.id} cold capacity exceeds total capacity`);
    if (vehicle.emissionsKgPerKm < 0) errors.push(`vehicle ${vehicle.id} emissions cannot be negative`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateScalableRegionalModel(model: RegionalModel): RegionalModelValidation {
  return validateRegionalModel(model, {
    maxDemands: 250,
    solverLabel: "the bounded scalable solver",
    enforceExactSearchBudget: false,
  });
}

export const REGIONAL_MODEL: RegionalModel = {
  district: "Mizunoki District, Japan · synthetic",
  nodes: [
    { id: "hub", label: "Joint logistics hub", kind: "hub", x: 10, y: 55 },
    { id: "west", label: "Tsukimi", kind: "community", x: 27, y: 29 },
    { id: "center", label: "Mizunoki", kind: "community", x: 43, y: 51 },
    { id: "north", label: "Shirasagi", kind: "community", x: 55, y: 18 },
    { id: "east", label: "Kawane", kind: "community", x: 73, y: 39 },
    { id: "remote", label: "Kitayama", kind: "community", x: 89, y: 16 },
    { id: "south", label: "Hinata", kind: "community", x: 47, y: 82 },
    { id: "clinic", label: "Regional clinic", kind: "clinic", x: 84, y: 76 },
  ],
  roads: [
    { id: "hub-west", label: "Prefectural 18", from: "hub", to: "west", distanceKm: 7.2, travelMinutes: 11, conditionGrade: 2, annualFailureProbability: 0.025, repairCostM: 38, weightLimitT: 8 },
    { id: "hub-center", label: "Mizunoki Main", from: "hub", to: "center", distanceKm: 10.1, travelMinutes: 15, conditionGrade: 2, annualFailureProbability: 0.03, repairCostM: 48, weightLimitT: 10 },
    { id: "west-center", label: "Tsukimi Pass", from: "west", to: "center", distanceKm: 8.4, travelMinutes: 14, conditionGrade: 3, annualFailureProbability: 0.075, repairCostM: 44, weightLimitT: 5 },
    { id: "west-north", label: "Shirasagi Bridge", from: "west", to: "north", distanceKm: 9.3, travelMinutes: 15, conditionGrade: 4, annualFailureProbability: 0.17, repairCostM: 78, weightLimitT: 4 },
    { id: "center-north", label: "North Forest Road", from: "center", to: "north", distanceKm: 7.4, travelMinutes: 12, conditionGrade: 3, annualFailureProbability: 0.085, repairCostM: 54, weightLimitT: 6 },
    { id: "north-remote", label: "Kitayama Bridge", from: "north", to: "remote", distanceKm: 11.8, travelMinutes: 19, conditionGrade: 4, annualFailureProbability: 0.21, repairCostM: 108, weightLimitT: 4 },
    { id: "center-east", label: "Kawane Valley Road", from: "center", to: "east", distanceKm: 10.6, travelMinutes: 17, conditionGrade: 3, annualFailureProbability: 0.1, repairCostM: 64, weightLimitT: 8 },
    { id: "east-remote", label: "Remote Ridge Road", from: "east", to: "remote", distanceKm: 9.1, travelMinutes: 16, conditionGrade: 4, annualFailureProbability: 0.19, repairCostM: 92, weightLimitT: 3.5 },
    { id: "east-clinic", label: "Clinic Connector", from: "east", to: "clinic", distanceKm: 8.2, travelMinutes: 13, conditionGrade: 2, annualFailureProbability: 0.04, repairCostM: 46, weightLimitT: 8 },
    { id: "center-south", label: "Hinata Road", from: "center", to: "south", distanceKm: 9.8, travelMinutes: 15, conditionGrade: 3, annualFailureProbability: 0.09, repairCostM: 58, weightLimitT: 6 },
    { id: "south-clinic", label: "South Gorge Bridge", from: "south", to: "clinic", distanceKm: 9.4, travelMinutes: 15, conditionGrade: 4, annualFailureProbability: 0.155, repairCostM: 84, weightLimitT: 4.5 },
    { id: "center-clinic", label: "Medical Access Road", from: "center", to: "clinic", distanceKm: 15.5, travelMinutes: 22, conditionGrade: 3, annualFailureProbability: 0.07, repairCostM: 72, weightLimitT: 8 },
  ],
  demands: [
    { id: "d-west", nodeId: "west", label: "Tsukimi homes", households: 88, vulnerableResidents: 24, parcels: 14, coldParcels: 2, deadlineMinutes: 92, priority: "essential" },
    { id: "d-north", nodeId: "north", label: "Shirasagi homes", households: 64, vulnerableResidents: 32, parcels: 13, coldParcels: 3, deadlineMinutes: 76, priority: "essential" },
    { id: "d-east", nodeId: "east", label: "Kawane homes", households: 112, vulnerableResidents: 18, parcels: 17, coldParcels: 0, deadlineMinutes: 145, priority: "standard" },
    { id: "d-remote", nodeId: "remote", label: "Kitayama medicine", households: 46, vulnerableResidents: 41, parcels: 12, coldParcels: 5, deadlineMinutes: 79, priority: "critical" },
    { id: "d-south", nodeId: "south", label: "Hinata homes", households: 73, vulnerableResidents: 20, parcels: 15, coldParcels: 0, deadlineMinutes: 155, priority: "standard" },
    { id: "d-clinic", nodeId: "clinic", label: "Regional clinic", households: 35, vulnerableResidents: 17, parcels: 8, coldParcels: 8, deadlineMinutes: 75, priority: "critical" },
  ],
  vehicles: [
    { id: "JP-21", label: "Postal EV van", operator: "Japan Post partner", depotNodeId: "hub", capacityParcels: 34, coldCapacity: 6, shiftMinutes: 230, weightT: 3.2, emissionsKgPerKm: 0.05, color: "#176b55" },
    { id: "CO-08", label: "Co-op refrigerated van", operator: "Regional co-op", depotNodeId: "hub", capacityParcels: 30, coldCapacity: 12, shiftMinutes: 230, weightT: 4.2, emissionsKgPerKm: 0.19, color: "#266bd3" },
    { id: "MB-03", label: "Community mixed-use bus", operator: "Municipal mobility", depotNodeId: "center", capacityParcels: 38, coldCapacity: 4, shiftMinutes: 205, weightT: 5.5, emissionsKgPerKm: 0.31, color: "#b87314" },
  ],
};

function buildAdjacency(model: RegionalModel, closedRoadIds: Set<string>, vehicle?: RegionalVehicle) {
  const adjacency = new Map<string, { to: string; road: RoadSegment }[]>();
  for (const node of model.nodes) adjacency.set(node.id, []);
  for (const road of model.roads) {
    if (closedRoadIds.has(road.id)) continue;
    if (vehicle && vehicle.weightT > road.weightLimitT) continue;
    adjacency.get(road.from)?.push({ to: road.to, road });
    adjacency.get(road.to)?.push({ to: road.from, road });
  }
  return adjacency;
}

function shortestLeg(
  model: RegionalModel,
  from: string,
  to: string,
  closedRoadIds: Set<string>,
  vehicle?: RegionalVehicle,
): GraphLeg | null {
  if (from === to) return { distanceKm: 0, travelMinutes: 0, roadIds: [] };
  const adjacency = buildAdjacency(model, closedRoadIds, vehicle);
  const best = new Map<string, number>([[from, 0]]);
  const distance = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, { node: string; roadId: string }>();
  type HeapItem = { node: string; cost: number; distanceKm: number };
  const heap: HeapItem[] = [{ node: from, cost: 0, distanceKm: 0 }];
  const less = (left: HeapItem, right: HeapItem) => left.cost < right.cost
    || (left.cost === right.cost && left.distanceKm < right.distanceKm)
    || (left.cost === right.cost && left.distanceKm === right.distanceKm && left.node < right.node);
  const push = (item: HeapItem) => {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!less(heap[index], heap[parent])) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
  };
  const pop = () => {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last) {
      heap[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < heap.length && less(heap[left], heap[smallest])) smallest = left;
        if (right < heap.length && less(heap[right], heap[smallest])) smallest = right;
        if (smallest === index) break;
        [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
        index = smallest;
      }
    }
    return first;
  };

  while (heap.length > 0) {
    const current = pop();
    if (!current) break;
    const knownCost = best.get(current.node) ?? Number.POSITIVE_INFINITY;
    const knownDistance = distance.get(current.node) ?? Number.POSITIVE_INFINITY;
    if (current.cost !== knownCost || current.distanceKm !== knownDistance) continue;
    if (current.node === to) break;
    for (const edge of adjacency.get(current.node) ?? []) {
      const nextCost = current.cost + edge.road.travelMinutes;
      const nextDistance = current.distanceKm + edge.road.distanceKm;
      const priorCost = best.get(edge.to) ?? Number.POSITIVE_INFINITY;
      const priorDistance = distance.get(edge.to) ?? Number.POSITIVE_INFINITY;
      if (nextCost < priorCost || (nextCost === priorCost && nextDistance < priorDistance)) {
        best.set(edge.to, nextCost);
        distance.set(edge.to, nextDistance);
        previous.set(edge.to, { node: current.node, roadId: edge.road.id });
        push({ node: edge.to, cost: nextCost, distanceKm: nextDistance });
      }
    }
  }
  if (!best.has(to)) return null;
  const roadIds: string[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = previous.get(cursor);
    if (!step) return null;
    roadIds.unshift(step.roadId);
    cursor = step.node;
  }
  return {
    distanceKm: distance.get(to) ?? 0,
    travelMinutes: best.get(to) ?? 0,
    roadIds,
  };
}

function permutations(values: number[]): number[][] {
  if (values.length <= 1) return [values];
  const result: number[][] = [];
  for (let index = 0; index < values.length; index += 1) {
    const head = values[index];
    const rest = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const tail of permutations(rest)) result.push([head, ...tail]);
  }
  return result;
}

function compareRoute(a: CandidateRoute, b: CandidateRoute) {
  const left = [a.lateCritical, a.lateStops, a.totalMinutes, a.distanceKm, a.emissionsKg];
  const right = [b.lateCritical, b.lateStops, b.totalMinutes, b.distanceKm, b.emissionsKg];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function emptyRoute(vehicle: RegionalVehicle): CandidateRoute {
  return {
    vehicle,
    stops: [],
    demandIds: [],
    distanceKm: 0,
    totalMinutes: 0,
    parcels: 0,
    coldParcels: 0,
    emissionsKg: 0,
    usedRoadSegmentIds: [],
    lateCritical: 0,
    lateStops: 0,
  };
}

type LegLookup = (from: string, to: string, vehicle: RegionalVehicle) => GraphLeg | null;

function routeForOrder(
  model: RegionalModel,
  vehicle: RegionalVehicle,
  order: number[],
  legLookup: LegLookup,
): CandidateRoute | null {
  if (order.length === 0) return emptyRoute(vehicle);
  const subset = order.map((index) => model.demands[index]);
  const parcels = subset.reduce((sum, demand) => sum + demand.parcels, 0);
  const coldParcels = subset.reduce((sum, demand) => sum + demand.coldParcels, 0);
  if (parcels > vehicle.capacityParcels || coldParcels > vehicle.coldCapacity) return null;

  let currentNode = vehicle.depotNodeId;
  let totalMinutes = 0;
  let distanceKm = 0;
  const stops: RouteStop[] = [];
  const usedRoadSegmentIds: string[] = [];
  for (const demandIndex of order) {
    const demand = model.demands[demandIndex];
    const leg = legLookup(currentNode, demand.nodeId, vehicle);
    if (!leg) return null;
    totalMinutes += leg.travelMinutes;
    distanceKm += leg.distanceKm;
    usedRoadSegmentIds.push(...leg.roadIds);
    stops.push({
      demandId: demand.id,
      label: demand.label,
      arrivalMinutes: totalMinutes,
      deadlineMinutes: demand.deadlineMinutes,
      onTime: totalMinutes <= demand.deadlineMinutes,
    });
    totalMinutes += 7;
    currentNode = demand.nodeId;
  }
  const returnLeg = legLookup(currentNode, vehicle.depotNodeId, vehicle);
  if (!returnLeg) return null;
  totalMinutes += returnLeg.travelMinutes;
  distanceKm += returnLeg.distanceKm;
  usedRoadSegmentIds.push(...returnLeg.roadIds);
  if (totalMinutes > vehicle.shiftMinutes) return null;
  const lateDemandIds = new Set(stops.filter((stop) => !stop.onTime).map((stop) => stop.demandId));
  return {
    vehicle,
    stops,
    demandIds: order.map((index) => model.demands[index].id),
    distanceKm: round(distanceKm),
    totalMinutes: round(totalMinutes),
    parcels,
    coldParcels,
    emissionsKg: round(distanceKm * vehicle.emissionsKgPerKm, 2),
    usedRoadSegmentIds: [...new Set(usedRoadSegmentIds)],
    lateCritical: subset.filter((demand) => demand.priority === "critical" && lateDemandIds.has(demand.id)).length,
    lateStops: lateDemandIds.size,
  };
}

function bestRouteForSubset(
  model: RegionalModel,
  vehicle: RegionalVehicle,
  demandIndices: number[],
  closedRoadIds: Set<string>,
): CandidateRoute | null {
  const legLookup: LegLookup = (from, to, candidateVehicle) => shortestLeg(model, from, to, closedRoadIds, candidateVehicle);
  let bestRoute: CandidateRoute | null = null;
  for (const order of permutations(demandIndices)) {
    const candidate = routeForOrder(model, vehicle, order, legLookup);
    if (!candidate) continue;
    if (!bestRoute || compareRoute(candidate, bestRoute) < 0) bestRoute = candidate;
  }
  return bestRoute;
}

function masksFromAssignment(assignment: number[], vehicleCount: number) {
  const masks = Array.from({ length: vehicleCount }, () => 0);
  assignment.forEach((vehicleIndex, demandIndex) => {
    if (vehicleIndex >= 0) masks[vehicleIndex] |= 1 << demandIndex;
  });
  return masks;
}

function buildMetrics(model: RegionalModel, routes: RegionalVehicleRoute[]): RegionalPlanMetrics {
  const onTime = new Set(routes.flatMap((route) => route.stops.filter((stop) => stop.onTime).map((stop) => stop.demandId)));
  const assigned = new Set(routes.flatMap((route) => route.demandIds));
  const unserved = model.demands.filter((demand) => !assigned.has(demand.id));
  const late = model.demands.filter((demand) => assigned.has(demand.id) && !onTime.has(demand.id));
  const covered = model.demands.filter((demand) => onTime.has(demand.id));
  const totalHouseholds = model.demands.reduce((sum, demand) => sum + demand.households, 0);
  const totalVulnerable = model.demands.reduce((sum, demand) => sum + demand.vulnerableResidents, 0);
  const householdsCovered = covered.reduce((sum, demand) => sum + demand.households, 0);
  const vulnerableResidentsCovered = covered.reduce((sum, demand) => sum + demand.vulnerableResidents, 0);
  return {
    serviceCoveragePercent: totalHouseholds > 0 ? round((householdsCovered / totalHouseholds) * 100) : 100,
    vulnerableCoveragePercent: totalVulnerable > 0 ? round((vulnerableResidentsCovered / totalVulnerable) * 100) : 100,
    householdsCovered,
    vulnerableResidentsCovered,
    parcelsDeliveredOnTime: covered.reduce((sum, demand) => sum + demand.parcels, 0),
    totalDistanceKm: round(routes.reduce((sum, route) => sum + route.distanceKm, 0)),
    totalMinutes: round(routes.reduce((sum, route) => sum + route.totalMinutes, 0)),
    emissionsKg: round(routes.reduce((sum, route) => sum + route.emissionsKg, 0), 2),
    unservedDemandIds: unserved.map((demand) => demand.id),
    lateDemandIds: late.map((demand) => demand.id),
    criticalFailures: [...unserved, ...late].filter((demand) => demand.priority === "critical").length,
  };
}

function planTuple(model: RegionalModel, plan: RegionalDeliveryPlan) {
  const failed = new Set([...plan.metrics.unservedDemandIds, ...plan.metrics.lateDemandIds]);
  const vulnerableMissed = model.demands.filter((demand) => failed.has(demand.id)).reduce((sum, demand) => sum + demand.vulnerableResidents, 0);
  const parcelsMissed = model.demands.filter((demand) => failed.has(demand.id)).reduce((sum, demand) => sum + demand.parcels, 0);
  const timeSlack = plan.routes.flatMap((route) => route.stops.map((stop) => stop.deadlineMinutes - stop.arrivalMinutes));
  const minimumTimeSlack = timeSlack.length > 0 ? Math.min(...timeSlack) : 0;
  const capacityHeadroom = plan.routes.map((route) => (
    route.parcels > 0 ? ((route.vehicle.capacityParcels - route.parcels) / route.parcels) * 100 : 100
  ));
  const minimumCapacityHeadroom = capacityHeadroom.length > 0 ? Math.min(...capacityHeadroom) : 0;
  return [
    plan.metrics.criticalFailures,
    vulnerableMissed,
    parcelsMissed,
    plan.metrics.lateDemandIds.length,
    -minimumTimeSlack,
    -minimumCapacityHeadroom,
    plan.metrics.totalMinutes,
    plan.metrics.totalDistanceKm,
    plan.metrics.emissionsKg,
  ];
}

function comparePlans(model: RegionalModel, a: RegionalDeliveryPlan, b: RegionalDeliveryPlan) {
  const left = planTuple(model, a);
  const right = planTuple(model, b);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function solveRegionalDelivery(
  model: RegionalModel = REGIONAL_MODEL,
  closedRoadIds: string[] = [],
): RegionalDeliveryPlan {
  const validation = validateRegionalModel(model);
  if (!validation.valid) throw new Error(`Invalid regional model: ${validation.errors.join("; ")}`);
  const knownRoadIds = new Set(model.roads.map((road) => road.id));
  const unknownClosures = closedRoadIds.filter((id) => !knownRoadIds.has(id));
  if (unknownClosures.length > 0) throw new Error(`Unknown closed road: ${unknownClosures.join(", ")}`);
  const cacheKey = model === REGIONAL_MODEL ? [...closedRoadIds].sort().join("|") || "baseline" : null;
  if (cacheKey && defaultPlanCache.has(cacheKey)) return defaultPlanCache.get(cacheKey)!;
  const closed = new Set(closedRoadIds);
  const demandCount = model.demands.length;
  const routeCache: (CandidateRoute | null)[][] = model.vehicles.map((vehicle) => {
    const routes: (CandidateRoute | null)[] = [];
    for (let mask = 0; mask < 1 << demandCount; mask += 1) {
      const indices = model.demands.flatMap((_, index) => mask & (1 << index) ? [index] : []);
      routes[mask] = bestRouteForSubset(model, vehicle, indices, closed);
    }
    return routes;
  });

  const assignment = Array.from({ length: demandCount }, () => -1);
  const candidateAssignments = (model.vehicles.length + 1) ** demandCount;
  let feasibleAssignments = 0;
  let bestPlan: RegionalDeliveryPlan | null = null;

  function visit(demandIndex: number) {
    if (demandIndex < demandCount) {
      for (let vehicleIndex = -1; vehicleIndex < model.vehicles.length; vehicleIndex += 1) {
        assignment[demandIndex] = vehicleIndex;
        visit(demandIndex + 1);
      }
      return;
    }
    const masks = masksFromAssignment(assignment, model.vehicles.length);
    const routes = masks.map((mask, vehicleIndex) => routeCache[vehicleIndex][mask]);
    if (routes.some((route) => !route)) return;
    feasibleAssignments += 1;
    const activeRoutes = routes.filter((route): route is CandidateRoute => Boolean(route && route.demandIds.length > 0));
    const plan: RegionalDeliveryPlan = {
      algorithm: "Exact pooled heterogeneous VRPTW",
      routes: activeRoutes,
      metrics: buildMetrics(model, activeRoutes),
      candidateAssignments,
      feasibleAssignments: 0,
      optimalityCertified: true,
      search: {
        mode: "exact",
        deterministic: true,
        starts: 1,
        candidatesEvaluated: candidateAssignments,
        feasibleCandidates: 0,
        optimalityGap: 0,
      },
    };
    if (!bestPlan || comparePlans(model, plan, bestPlan) < 0) bestPlan = plan;
  }

  visit(0);
  const selectedPlan = bestPlan as RegionalDeliveryPlan | null;
  if (!selectedPlan) throw new Error("No feasible regional delivery plan exists");
  const result: RegionalDeliveryPlan = {
    ...selectedPlan,
    feasibleAssignments,
    search: { ...selectedPlan.search, feasibleCandidates: feasibleAssignments },
  };
  if (cacheKey) defaultPlanCache.set(cacheKey, result);
  return result;
}

function compareNumberTuples(left: number[], right: number[]) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function lateVulnerableResidents(model: RegionalModel, route: CandidateRoute) {
  const late = new Set(route.stops.filter((stop) => !stop.onTime).map((stop) => stop.demandId));
  return model.demands
    .filter((demand) => late.has(demand.id))
    .reduce((sum, demand) => sum + demand.vulnerableResidents, 0);
}

function deterministicDemandOrders(model: RegionalModel) {
  const indices = model.demands.map((_, index) => index);
  const priorityRank: Record<RegionalPriority, number> = { critical: 0, essential: 1, standard: 2 };
  const stable = (left: number, right: number) => model.demands[left].id.localeCompare(model.demands[right].id);
  return [
    [...indices].sort((left, right) => {
      const a = model.demands[left];
      const b = model.demands[right];
      return priorityRank[a.priority] - priorityRank[b.priority]
        || a.deadlineMinutes - b.deadlineMinutes
        || b.vulnerableResidents - a.vulnerableResidents
        || b.coldParcels - a.coldParcels
        || stable(left, right);
    }),
    [...indices].sort((left, right) => {
      const a = model.demands[left];
      const b = model.demands[right];
      return a.deadlineMinutes - b.deadlineMinutes
        || priorityRank[a.priority] - priorityRank[b.priority]
        || b.vulnerableResidents - a.vulnerableResidents
        || stable(left, right);
    }),
    [...indices].sort((left, right) => {
      const a = model.demands[left];
      const b = model.demands[right];
      const aDifficulty = a.coldParcels * 10_000 + a.parcels * 100 + a.vulnerableResidents;
      const bDifficulty = b.coldParcels * 10_000 + b.parcels * 100 + b.vulnerableResidents;
      return priorityRank[a.priority] - priorityRank[b.priority]
        || bDifficulty - aDifficulty
        || a.deadlineMinutes - b.deadlineMinutes
        || stable(left, right);
    }),
  ];
}

/**
 * Deterministic bounded solver for pilot-scale request payloads.
 *
 * This solver produces constraint-feasible routes but does not claim optimality.
 * It runs three priority-aware insertion starts and a deterministic 2-opt pass,
 * then returns the best complete plan under the same lexicographic public-service
 * objective as the inspectable exact solver.
 */
export function solveRegionalDeliveryScalable(
  model: RegionalModel,
  closedRoadIds: string[] = [],
): RegionalDeliveryPlan {
  const validation = validateScalableRegionalModel(model);
  if (!validation.valid) throw new Error(`Invalid scalable regional model: ${validation.errors.join("; ")}`);
  const knownRoadIds = new Set(model.roads.map((road) => road.id));
  const unknownClosures = closedRoadIds.filter((id) => !knownRoadIds.has(id));
  if (unknownClosures.length > 0) throw new Error(`Unknown closed road: ${unknownClosures.join(", ")}`);

  const closed = new Set(closedRoadIds);
  const legCache = new Map<string, GraphLeg | null>();
  const legLookup: LegLookup = (from, to, vehicle) => {
    // Graph reachability depends on the weight threshold, not vehicle identity.
    // Sharing legs across equal-weight vehicles avoids duplicate routing work.
    const key = `${vehicle.weightT}|${from}|${to}`;
    if (!legCache.has(key)) legCache.set(key, shortestLeg(model, from, to, closed, vehicle));
    return legCache.get(key) ?? null;
  };
  let candidatesEvaluated = 0;
  let feasibleCandidates = 0;

  const buildStart = (demandOrder: number[]): RegionalDeliveryPlan => {
    const routeOrders = model.vehicles.map(() => [] as number[]);
    let routes = model.vehicles.map((vehicle) => emptyRoute(vehicle));

    for (const demandIndex of demandOrder) {
      let best: { vehicleIndex: number; order: number[]; route: CandidateRoute; tuple: number[] } | null = null;
      for (let vehicleIndex = 0; vehicleIndex < model.vehicles.length; vehicleIndex += 1) {
        const vehicle = model.vehicles[vehicleIndex];
        const current = routes[vehicleIndex];
        for (let position = 0; position <= routeOrders[vehicleIndex].length; position += 1) {
          candidatesEvaluated += 1;
          const order = [
            ...routeOrders[vehicleIndex].slice(0, position),
            demandIndex,
            ...routeOrders[vehicleIndex].slice(position),
          ];
          const candidate = routeForOrder(model, vehicle, order, legLookup);
          if (!candidate) continue;
          feasibleCandidates += 1;
          const tuple = [
            candidate.lateCritical - current.lateCritical,
            lateVulnerableResidents(model, candidate) - lateVulnerableResidents(model, current),
            candidate.lateStops - current.lateStops,
            candidate.totalMinutes - current.totalMinutes,
            candidate.distanceKm - current.distanceKm,
            candidate.emissionsKg - current.emissionsKg,
            vehicleIndex,
            position,
          ];
          if (!best || compareNumberTuples(tuple, best.tuple) < 0) {
            best = { vehicleIndex, order, route: candidate, tuple };
          }
        }
      }
      if (best) {
        routeOrders[best.vehicleIndex] = best.order;
        routes[best.vehicleIndex] = best.route;
      }
    }

    // A bounded deterministic 2-opt pass reduces avoidable travel without
    // changing vehicle ownership or silently relaxing any hard constraint.
    routes = routes.map((route, vehicleIndex) => {
      let bestRoute = route;
      let bestOrder = routeOrders[vehicleIndex];
      for (let left = 0; left < bestOrder.length - 1; left += 1) {
        for (let right = left + 1; right < bestOrder.length; right += 1) {
          candidatesEvaluated += 1;
          const candidateOrder = [
            ...bestOrder.slice(0, left),
            ...bestOrder.slice(left, right + 1).reverse(),
            ...bestOrder.slice(right + 1),
          ];
          const candidate = routeForOrder(model, route.vehicle, candidateOrder, legLookup);
          if (!candidate) continue;
          feasibleCandidates += 1;
          if (compareRoute(candidate, bestRoute) < 0) {
            bestRoute = candidate;
            bestOrder = candidateOrder;
          }
        }
      }
      routeOrders[vehicleIndex] = bestOrder;
      return bestRoute;
    });

    const activeRoutes = routes.filter((route) => route.demandIds.length > 0);
    return {
      algorithm: "Deterministic multi-start insertion VRPTW",
      routes: activeRoutes,
      metrics: buildMetrics(model, activeRoutes),
      candidateAssignments: 0,
      feasibleAssignments: 0,
      optimalityCertified: false,
      search: {
        mode: "scalable-heuristic",
        deterministic: true,
        starts: 3,
        candidatesEvaluated: 0,
        feasibleCandidates: 0,
        optimalityGap: null,
      },
    };
  };

  let bestPlan: RegionalDeliveryPlan | null = null;
  for (const demandOrder of deterministicDemandOrders(model)) {
    const candidate = buildStart(demandOrder);
    if (!bestPlan || comparePlans(model, candidate, bestPlan) < 0) bestPlan = candidate;
  }
  if (!bestPlan) throw new Error("No scalable regional delivery plan could be constructed");
  return {
    ...bestPlan,
    candidateAssignments: candidatesEvaluated,
    feasibleAssignments: feasibleCandidates,
    search: {
      ...bestPlan.search,
      candidatesEvaluated,
      feasibleCandidates,
    },
  };
}

export function planRegionalDelivery(
  model: RegionalModel,
  closedRoadIds: string[] = [],
): RegionalDeliveryPlan {
  return model.demands.length <= 10 && estimateRegionalExactSearch(model).withinBudget
    ? solveRegionalDelivery(model, closedRoadIds)
    : solveRegionalDeliveryScalable(model, closedRoadIds);
}

function buildRoadCriticality(model: RegionalModel, baseline: RegionalDeliveryPlan): RoadCriticality[] {
  const results = model.roads.map((road) => {
    const closurePlan = solveRegionalDelivery(model, [road.id]);
    const vulnerableResidentsAtRisk = Math.max(0, baseline.metrics.vulnerableResidentsCovered - closurePlan.metrics.vulnerableResidentsCovered);
    const householdsAtRisk = Math.max(0, baseline.metrics.householdsCovered - closurePlan.metrics.householdsCovered);
    const parcelsAtRisk = Math.max(0, baseline.metrics.parcelsDeliveredOnTime - closurePlan.metrics.parcelsDeliveredOnTime);
    const addedVehicleMinutes = Math.max(0, closurePlan.metrics.totalMinutes - baseline.metrics.totalMinutes);
    const serviceImpact = round(
      closurePlan.metrics.criticalFailures * 120
      + vulnerableResidentsAtRisk * 4
      + householdsAtRisk * 0.7
      + parcelsAtRisk * 2
      + addedVehicleMinutes * 0.45,
      2,
    );
    return {
      road,
      rank: 0,
      serviceImpact,
      expectedAnnualRisk: round(serviceImpact * road.annualFailureProbability, 2),
      vulnerableResidentsAtRisk,
      householdsAtRisk,
      parcelsAtRisk,
      addedVehicleMinutes: round(addedVehicleMinutes),
      criticalFailures: closurePlan.metrics.criticalFailures,
      closurePlan,
    };
  });
  return results
    .sort((a, b) => b.expectedAnnualRisk - a.expectedAnnualRisk || b.serviceImpact - a.serviceImpact || a.road.id.localeCompare(b.road.id))
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function optimizeRepairPortfolio(roadCriticality: RoadCriticality[], budgetM: number): RepairPortfolio {
  const eligible = roadCriticality.filter((item) => item.road.conditionGrade >= 3 && item.expectedAnnualRisk > 0);
  let bestMask = 0;
  let bestBenefit = 0;
  let bestCost = 0;
  let portfoliosEvaluated = 0;
  for (let mask = 0; mask < 1 << eligible.length; mask += 1) {
    portfoliosEvaluated += 1;
    let cost = 0;
    let benefit = 0;
    for (let index = 0; index < eligible.length; index += 1) {
      if (!(mask & (1 << index))) continue;
      cost += eligible[index].road.repairCostM;
      benefit += eligible[index].expectedAnnualRisk * 0.85;
    }
    if (cost > budgetM) continue;
    if (benefit > bestBenefit || (benefit === bestBenefit && cost < bestCost)) {
      bestMask = mask;
      bestBenefit = benefit;
      bestCost = cost;
    }
  }
  const selectedRoads = eligible.filter((_, index) => bestMask & (1 << index));
  const totalRisk = eligible.reduce((sum, item) => sum + item.expectedAnnualRisk, 0);
  return {
    budgetM,
    selectedRoads,
    costM: bestCost,
    expectedRiskReduction: round(bestBenefit, 2),
    riskReductionPercent: totalRisk > 0 ? round((bestBenefit / totalRisk) * 100) : 0,
    portfoliosEvaluated,
    optimalityCertified: true,
  };
}

function halton(index: number, base: number) {
  let result = 0;
  let fraction = 1 / base;
  let value = index;
  while (value > 0) {
    result += fraction * (value % base);
    value = Math.floor(value / base);
    fraction /= base;
  }
  return result;
}

function stressPlan(model: RegionalModel, plan: RegionalDeliveryPlan, scenarioCount = 64): RegionalStressResult {
  let fullSuccess = 0;
  let criticalSuccess = 0;
  let worstCapacityOverrunParcels = 0;
  let worstLateMinutes = 0;
  for (let scenario = 1; scenario <= scenarioCount; scenario += 1) {
    const demandScale = 0.96 + halton(scenario, 2) * 0.26;
    const travelScale = 0.98 + halton(scenario, 3) * 0.32;
    let allPass = plan.metrics.unservedDemandIds.length === 0 && plan.metrics.lateDemandIds.length === 0;
    let criticalPass = plan.metrics.criticalFailures === 0;
    for (const route of plan.routes) {
      const capacityOverrun = Math.max(0, route.parcels * demandScale - route.vehicle.capacityParcels);
      worstCapacityOverrunParcels = Math.max(worstCapacityOverrunParcels, capacityOverrun);
      if (capacityOverrun > 0) {
        allPass = false;
        if (route.demandIds.some((id) => model.demands.find((demand) => demand.id === id)?.priority === "critical")) criticalPass = false;
      }
      for (const stop of route.stops) {
        const adjustedArrival = stop.arrivalMinutes * travelScale;
        const lateMinutes = Math.max(0, adjustedArrival - stop.deadlineMinutes);
        worstLateMinutes = Math.max(worstLateMinutes, lateMinutes);
        if (lateMinutes > 0) {
          allPass = false;
          if (model.demands.find((demand) => demand.id === stop.demandId)?.priority === "critical") criticalPass = false;
        }
      }
    }
    if (allPass) fullSuccess += 1;
    if (criticalPass) criticalSuccess += 1;
  }
  return {
    scenarioCount,
    fullServiceSuccessRate: round((fullSuccess / scenarioCount) * 100),
    criticalServiceSuccessRate: round((criticalSuccess / scenarioCount) * 100),
    worstCapacityOverrunParcels: round(worstCapacityOverrunParcels),
    worstLateMinutes: round(worstLateMinutes),
  };
}

function singleStopBaselineDistance(model: RegionalModel, closedRoadIds: string[]) {
  const closed = new Set(closedRoadIds);
  return round(model.demands.reduce((sum, demand) => {
    const eligible = model.vehicles
      .filter((vehicle) => demand.coldParcels <= vehicle.coldCapacity && demand.parcels <= vehicle.capacityParcels)
      .map((vehicle) => shortestLeg(model, vehicle.depotNodeId, demand.nodeId, closed, vehicle))
      .filter((leg): leg is GraphLeg => Boolean(leg));
    const shortest = eligible.sort((a, b) => a.distanceKm - b.distanceKm)[0];
    return sum + (shortest ? shortest.distanceKm * 2 : 0);
  }, 0));
}

export function analyzeRegionalAccess(
  closedSegmentId: string | null = null,
  budgetM = 120,
  model: RegionalModel = REGIONAL_MODEL,
): RegionalAnalysis {
  const baseline = solveRegionalDelivery(model);
  const activePlan = closedSegmentId ? solveRegionalDelivery(model, [closedSegmentId]) : baseline;
  const roadCriticality = buildRoadCriticality(model, baseline);
  const repairPortfolio = optimizeRepairPortfolio(roadCriticality, budgetM);
  const singleStopBaselineKm = singleStopBaselineDistance(model, closedSegmentId ? [closedSegmentId] : []);
  const pooledDistanceSavingPercent = singleStopBaselineKm > 0
    ? round(((singleStopBaselineKm - activePlan.metrics.totalDistanceKm) / singleStopBaselineKm) * 100)
    : 0;
  const stress = stressPlan(model, activePlan);
  return {
    model,
    closedSegmentId,
    baseline,
    activePlan,
    roadCriticality,
    repairPortfolio,
    stress,
    singleStopBaselineKm,
    pooledDistanceSavingPercent,
    evidence: {
      algorithm: "Regional access twin: exact VRPTW + N-1 road graph + exact repair knapsack",
      deliveryCandidateAssignments: activePlan.candidateAssignments,
      nMinusOneRoadCases: model.roads.length,
      repairPortfoliosEvaluated: repairPortfolio.portfoliosEvaluated,
      stressScenarios: stress.scenarioCount,
    },
  };
}
