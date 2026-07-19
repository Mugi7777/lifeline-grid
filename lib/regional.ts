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
  algorithm: "Exact pooled heterogeneous VRPTW";
  routes: RegionalVehicleRoute[];
  metrics: RegionalPlanMetrics;
  candidateAssignments: number;
  feasibleAssignments: number;
  optimalityCertified: boolean;
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

export function validateRegionalModel(model: RegionalModel): RegionalModelValidation {
  const errors: string[] = [];
  const duplicateIds = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const roadIds = model.roads.map((road) => road.id);
  const demandIds = model.demands.map((demand) => demand.id);
  const vehicleIds = model.vehicles.map((vehicle) => vehicle.id);

  if (!model.district.trim()) errors.push("district is required");
  if (model.nodes.length < 2) errors.push("at least two nodes are required");
  if (model.roads.length < 1) errors.push("at least one road is required");
  if (model.demands.length < 1) errors.push("at least one demand is required");
  if (model.demands.length > 10) errors.push("the inspectable exact solver accepts at most 10 demands");
  if (model.vehicles.length < 1) errors.push("at least one vehicle is required");
  for (const id of duplicateIds(model.nodes.map((node) => node.id))) errors.push(`duplicate node id: ${id}`);
  for (const id of duplicateIds(roadIds)) errors.push(`duplicate road id: ${id}`);
  for (const id of duplicateIds(demandIds)) errors.push(`duplicate demand id: ${id}`);
  for (const id of duplicateIds(vehicleIds)) errors.push(`duplicate vehicle id: ${id}`);

  for (const road of model.roads) {
    if (!nodeIds.has(road.from) || !nodeIds.has(road.to)) errors.push(`road ${road.id} references an unknown node`);
    if (road.from === road.to) errors.push(`road ${road.id} must connect two different nodes`);
    if (road.distanceKm <= 0 || road.travelMinutes <= 0) errors.push(`road ${road.id} requires positive distance and travel time`);
    if (road.annualFailureProbability < 0 || road.annualFailureProbability > 1) errors.push(`road ${road.id} failure probability must be between 0 and 1`);
    if (road.repairCostM < 0 || road.weightLimitT <= 0) errors.push(`road ${road.id} has invalid repair cost or weight limit`);
  }
  for (const demand of model.demands) {
    if (!nodeIds.has(demand.nodeId)) errors.push(`demand ${demand.id} references an unknown node`);
    if (demand.households < 0 || demand.vulnerableResidents < 0 || demand.parcels < 0 || demand.coldParcels < 0) errors.push(`demand ${demand.id} contains a negative quantity`);
    if (demand.coldParcels > demand.parcels) errors.push(`demand ${demand.id} cold parcels exceed total parcels`);
    if (demand.deadlineMinutes <= 0) errors.push(`demand ${demand.id} requires a positive deadline`);
  }
  for (const vehicle of model.vehicles) {
    if (!nodeIds.has(vehicle.depotNodeId)) errors.push(`vehicle ${vehicle.id} references an unknown depot`);
    if (vehicle.capacityParcels <= 0 || vehicle.coldCapacity < 0 || vehicle.shiftMinutes <= 0 || vehicle.weightT <= 0) errors.push(`vehicle ${vehicle.id} contains an invalid hard limit`);
    if (vehicle.coldCapacity > vehicle.capacityParcels) errors.push(`vehicle ${vehicle.id} cold capacity exceeds total capacity`);
    if (vehicle.emissionsKgPerKm < 0) errors.push(`vehicle ${vehicle.id} emissions cannot be negative`);
  }
  return { valid: errors.length === 0, errors };
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
  const unvisited = new Set(model.nodes.map((node) => node.id));

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentCost = Number.POSITIVE_INFINITY;
    for (const node of unvisited) {
      const cost = best.get(node) ?? Number.POSITIVE_INFINITY;
      if (cost < currentCost) {
        current = node;
        currentCost = cost;
      }
    }
    if (!current || currentCost === Number.POSITIVE_INFINITY) break;
    unvisited.delete(current);
    if (current === to) break;
    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.to)) continue;
      const nextCost = currentCost + edge.road.travelMinutes;
      if (nextCost < (best.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        best.set(edge.to, nextCost);
        distance.set(edge.to, (distance.get(current) ?? 0) + edge.road.distanceKm);
        previous.set(edge.to, { node: current, roadId: edge.road.id });
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

function bestRouteForSubset(
  model: RegionalModel,
  vehicle: RegionalVehicle,
  demandIndices: number[],
  closedRoadIds: Set<string>,
): CandidateRoute | null {
  if (demandIndices.length === 0) {
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
  const subset = demandIndices.map((index) => model.demands[index]);
  const parcels = subset.reduce((sum, demand) => sum + demand.parcels, 0);
  const coldParcels = subset.reduce((sum, demand) => sum + demand.coldParcels, 0);
  if (parcels > vehicle.capacityParcels || coldParcels > vehicle.coldCapacity) return null;

  let bestRoute: CandidateRoute | null = null;
  for (const order of permutations(demandIndices)) {
    let currentNode = vehicle.depotNodeId;
    let totalMinutes = 0;
    let distanceKm = 0;
    let possible = true;
    const stops: RouteStop[] = [];
    const usedRoadSegmentIds: string[] = [];
    for (const demandIndex of order) {
      const demand = model.demands[demandIndex];
      const leg = shortestLeg(model, currentNode, demand.nodeId, closedRoadIds, vehicle);
      if (!leg) {
        possible = false;
        break;
      }
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
    const returnLeg = possible ? shortestLeg(model, currentNode, vehicle.depotNodeId, closedRoadIds, vehicle) : null;
    if (!possible || !returnLeg) continue;
    totalMinutes += returnLeg.travelMinutes;
    distanceKm += returnLeg.distanceKm;
    usedRoadSegmentIds.push(...returnLeg.roadIds);
    if (totalMinutes > vehicle.shiftMinutes) continue;
    const lateDemandIds = new Set(stops.filter((stop) => !stop.onTime).map((stop) => stop.demandId));
    const candidate: CandidateRoute = {
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
    serviceCoveragePercent: round((householdsCovered / totalHouseholds) * 100),
    vulnerableCoveragePercent: round((vulnerableResidentsCovered / totalVulnerable) * 100),
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
    };
    if (!bestPlan || comparePlans(model, plan, bestPlan) < 0) bestPlan = plan;
  }

  visit(0);
  if (!bestPlan) throw new Error("No feasible regional delivery plan exists");
  const result = { ...bestPlan, feasibleAssignments };
  if (cacheKey) defaultPlanCache.set(cacheKey, result);
  return result;
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
