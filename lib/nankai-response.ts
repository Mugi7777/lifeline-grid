import { sha256Hex } from "./regional-contract.ts";

export const NANKAI_RESPONSE_SCHEMA_VERSION = "2026-07-19.1";

export type NankaiPhase = "first_6_hours" | "hour_24" | "hour_72";
export type NankaiRoadState = "open" | "degraded" | "unknown" | "blocked";
export type NankaiCommodity = "water_100l" | "meals_10" | "medicine_kits";

export interface NankaiNode {
  id: string;
  label: string;
  kind: "command" | "depot" | "hospital" | "shelter" | "community" | "airbase";
  latitude: number;
  longitude: number;
  priority: number;
}

export interface NankaiRoad {
  id: string;
  label: string;
  from: string;
  to: string;
  minutes: number;
  clearanceMinutes: number;
  stateByPhase: Record<NankaiPhase, NankaiRoadState>;
}

export interface NankaiRoute {
  minutes: number;
  roadIds: string[];
}

export interface SupplyAssignment {
  commodity: NankaiCommodity;
  depotId: string;
  siteId: string;
  units: number;
  route: NankaiRoute;
}

export interface NankaiSupplyResult {
  commodities: Array<{
    commodity: NankaiCommodity;
    requestedUnits: number;
    deliveredUnits: number;
    coveragePercent: number;
    unmetBySite: Array<{ siteId: string; units: number }>;
    assignments: SupplyAssignment[];
  }>;
  totalRequestedUnits: number;
  totalDeliveredUnits: number;
  weightedCoveragePercent: number;
  evidence: { algorithm: "successive shortest augmenting path min-cost flow"; augmentations: number; relaxations: number };
}

export interface NankaiPowerResult {
  sites: Array<{
    siteId: string;
    requiredEnergyKwh: number;
    suppliedEnergyKwh: number;
    requiredOutputKw: number;
    suppliedOutputKw: number;
    met: boolean;
    priority: number;
  }>;
  assignments: Array<{ assetId: string; siteId: string; energyKwh: number; outputKw: number; route: NankaiRoute }>;
  criticalGaps: number;
  weightedUnmetKwh: number;
  candidatesEvaluated: number;
}

export interface NankaiMedicalResult {
  groundAssignments: Array<{
    vehicleId: string;
    caseId: string;
    totalMinutes: number;
    deadlineMinutes: number;
    roadIds: string[];
  }>;
  unresolved: Array<{
    caseId: string;
    originNodeId: string;
    priority: "critical" | "urgent";
    recommendedMode: "air_coordination_request" | "ground_waitlist";
    reason: string;
  }>;
  criticalGroundTransfers: number;
  casesPlanned: number;
  candidatesEvaluated: number;
}

export interface NankaiDroneResult {
  assignments: Array<{
    droneId: string;
    zoneId: string;
    score: number;
    totalMinutes: number;
    baseNodeId: string;
    targetNodeId: string;
  }>;
  unsearchedZoneIds: string[];
  weightedCoveragePercent: number;
  candidatesEvaluated: number;
}

export interface NankaiClearancePriority {
  rank: number;
  road: NankaiRoad;
  baseState: "unknown" | "blocked";
  restoredServiceSites: number;
  restoredMedicalCases: number;
  restoredCriticalSites: number;
  score: number;
}

export interface NankaiResponseAnalysis {
  schemaVersion: typeof NANKAI_RESPONSE_SCHEMA_VERSION;
  scenarioLabel: string;
  phase: NankaiPhase;
  interventionRoadId: string | null;
  nodes: NankaiNode[];
  roads: Array<NankaiRoad & { activeState: NankaiRoadState }>;
  supply: NankaiSupplyResult;
  power: NankaiPowerResult;
  medical: NankaiMedicalResult;
  drone: NankaiDroneResult;
  clearancePriorities: NankaiClearancePriority[];
  isolatedNodeIds: string[];
  metrics: {
    supplyCoveragePercent: number;
    powerCriticalGaps: number;
    medicalCasesPlanned: number;
    medicalAirRequests: number;
    droneZonesCovered: number;
    inaccessibleLocations: number;
  };
  evidence: {
    roadDijkstraRuns: number;
    roadRelaxations: number;
    clearanceCounterfactuals: number;
    minCostFlowAugmentations: number;
    exactPowerAssignments: number;
    exactMedicalAssignments: number;
    exactDroneAssignments: number;
  };
  gates: {
    tabletop: "synthetic_ready";
    fieldOperation: "blocked";
    autonomousDispatch: "prohibited";
    medicalAndAirTasking: "human_authority_required";
  };
}

export const NANKAI_PHASES: Array<{ id: NankaiPhase; label: string; short: string }> = [
  { id: "first_6_hours", label: "0–6 hours", short: "Life-safety window" },
  { id: "hour_24", label: "24 hours", short: "Push support" },
  { id: "hour_72", label: "72 hours", short: "Critical rescue horizon" },
];

export const NANKAI_NODES: NankaiNode[] = [
  { id: "inland-command", label: "Synthetic inland command", kind: "command", latitude: 33.657, longitude: 133.548, priority: 5 },
  { id: "west-depot", label: "Synthetic west logistics depot", kind: "depot", latitude: 33.579, longitude: 133.392, priority: 3 },
  { id: "east-depot", label: "Synthetic east logistics depot", kind: "depot", latitude: 33.578, longitude: 133.688, priority: 3 },
  { id: "regional-hospital", label: "Synthetic regional hospital", kind: "hospital", latitude: 33.592, longitude: 133.528, priority: 5 },
  { id: "coastal-hospital", label: "Synthetic coastal hospital", kind: "hospital", latitude: 33.515, longitude: 133.557, priority: 5 },
  { id: "west-shelter", label: "Synthetic west shelter", kind: "shelter", latitude: 33.535, longitude: 133.431, priority: 3 },
  { id: "central-shelter", label: "Synthetic central shelter", kind: "shelter", latitude: 33.526, longitude: 133.536, priority: 4 },
  { id: "east-shelter", label: "Synthetic east shelter", kind: "shelter", latitude: 33.535, longitude: 133.647, priority: 3 },
  { id: "mountain-community", label: "Synthetic mountain community", kind: "community", latitude: 33.701, longitude: 133.469, priority: 4 },
  { id: "air-staging", label: "Synthetic air staging base", kind: "airbase", latitude: 33.546, longitude: 133.674, priority: 4 },
];

export const NANKAI_ROADS: NankaiRoad[] = [
  { id: "command-hospital", label: "Inland command corridor", from: "inland-command", to: "regional-hospital", minutes: 15, clearanceMinutes: 40, stateByPhase: { first_6_hours: "open", hour_24: "open", hour_72: "open" } },
  { id: "command-mountain", label: "Northern mountain access", from: "inland-command", to: "mountain-community", minutes: 24, clearanceMinutes: 95, stateByPhase: { first_6_hours: "unknown", hour_24: "degraded", hour_72: "open" } },
  { id: "command-west", label: "Western inland trunk", from: "inland-command", to: "west-depot", minutes: 35, clearanceMinutes: 55, stateByPhase: { first_6_hours: "open", hour_24: "open", hour_72: "open" } },
  { id: "command-east", label: "Eastern inland trunk", from: "inland-command", to: "east-depot", minutes: 38, clearanceMinutes: 60, stateByPhase: { first_6_hours: "open", hour_24: "open", hour_72: "open" } },
  { id: "west-depot-shelter", label: "West shelter approach", from: "west-depot", to: "west-shelter", minutes: 13, clearanceMinutes: 35, stateByPhase: { first_6_hours: "degraded", hour_24: "open", hour_72: "open" } },
  { id: "west-central-coast", label: "West–central coastal corridor", from: "west-shelter", to: "central-shelter", minutes: 18, clearanceMinutes: 80, stateByPhase: { first_6_hours: "blocked", hour_24: "blocked", hour_72: "degraded" } },
  { id: "hospital-central", label: "Hospital–central relief corridor", from: "regional-hospital", to: "central-shelter", minutes: 14, clearanceMinutes: 50, stateByPhase: { first_6_hours: "unknown", hour_24: "degraded", hour_72: "open" } },
  { id: "central-coastal-hospital", label: "Central coastal hospital approach", from: "central-shelter", to: "coastal-hospital", minutes: 10, clearanceMinutes: 90, stateByPhase: { first_6_hours: "blocked", hour_24: "blocked", hour_72: "degraded" } },
  { id: "coastal-east", label: "Coastal hospital–east corridor", from: "coastal-hospital", to: "east-shelter", minutes: 20, clearanceMinutes: 105, stateByPhase: { first_6_hours: "blocked", hour_24: "blocked", hour_72: "degraded" } },
  { id: "east-depot-shelter", label: "East shelter approach", from: "east-depot", to: "east-shelter", minutes: 14, clearanceMinutes: 30, stateByPhase: { first_6_hours: "degraded", hour_24: "open", hour_72: "open" } },
  { id: "hospital-west", label: "Regional hospital–west corridor", from: "regional-hospital", to: "west-shelter", minutes: 25, clearanceMinutes: 70, stateByPhase: { first_6_hours: "blocked", hour_24: "unknown", hour_72: "degraded" } },
  { id: "hospital-east", label: "Regional hospital–east corridor", from: "regional-hospital", to: "east-shelter", minutes: 29, clearanceMinutes: 75, stateByPhase: { first_6_hours: "unknown", hour_24: "degraded", hour_72: "open" } },
  { id: "east-airbase", label: "East depot–air staging corridor", from: "east-depot", to: "air-staging", minutes: 8, clearanceMinutes: 25, stateByPhase: { first_6_hours: "open", hour_24: "open", hour_72: "open" } },
  { id: "airbase-coastal", label: "Air staging–coastal hospital road", from: "air-staging", to: "coastal-hospital", minutes: 16, clearanceMinutes: 65, stateByPhase: { first_6_hours: "blocked", hour_24: "unknown", hour_72: "degraded" } },
  { id: "hospital-mountain", label: "Regional hospital–mountain corridor", from: "regional-hospital", to: "mountain-community", minutes: 30, clearanceMinutes: 100, stateByPhase: { first_6_hours: "blocked", hour_24: "unknown", hour_72: "degraded" } },
];

const COMMODITIES: NankaiCommodity[] = ["water_100l", "meals_10", "medicine_kits"];

const SUPPLY_DEPOTS: Array<{ nodeId: string; inventory: Record<NankaiCommodity, number> }> = [
  { nodeId: "inland-command", inventory: { water_100l: 30, meals_10: 180, medicine_kits: 25 } },
  { nodeId: "west-depot", inventory: { water_100l: 20, meals_10: 120, medicine_kits: 8 } },
  { nodeId: "east-depot", inventory: { water_100l: 22, meals_10: 130, medicine_kits: 8 } },
];

const SUPPLY_DEMANDS: Array<{ nodeId: string; priority: number; demand: Record<NankaiCommodity, number> }> = [
  { nodeId: "regional-hospital", priority: 5, demand: { water_100l: 10, meals_10: 45, medicine_kits: 18 } },
  { nodeId: "coastal-hospital", priority: 5, demand: { water_100l: 12, meals_10: 60, medicine_kits: 20 } },
  { nodeId: "west-shelter", priority: 3, demand: { water_100l: 16, meals_10: 105, medicine_kits: 4 } },
  { nodeId: "central-shelter", priority: 4, demand: { water_100l: 20, meals_10: 130, medicine_kits: 6 } },
  { nodeId: "east-shelter", priority: 3, demand: { water_100l: 17, meals_10: 115, medicine_kits: 4 } },
  { nodeId: "mountain-community", priority: 4, demand: { water_100l: 8, meals_10: 50, medicine_kits: 3 } },
];

const POWER_ASSETS = [
  { id: "generator-01", baseNodeId: "inland-command", energyKwh: 260, outputKw: 80 },
  { id: "v2l-bus-01", baseNodeId: "east-depot", energyKwh: 320, outputKw: 50 },
  { id: "v2l-fleet-west", baseNodeId: "west-depot", energyKwh: 180, outputKw: 30 },
  { id: "battery-trailer-01", baseNodeId: "inland-command", energyKwh: 220, outputKw: 45 },
];

const POWER_SITES = [
  { nodeId: "regional-hospital", requiredEnergyKwh: 500, requiredOutputKw: 50, priority: 5 },
  { nodeId: "coastal-hospital", requiredEnergyKwh: 360, requiredOutputKw: 35, priority: 5 },
  { nodeId: "central-shelter", requiredEnergyKwh: 150, requiredOutputKw: 15, priority: 3 },
  { nodeId: "mountain-community", requiredEnergyKwh: 90, requiredOutputKw: 8, priority: 4 },
];

const MEDICAL_CASES = [
  { id: "icu-coastal-01", originNodeId: "coastal-hospital", destinationNodeId: "regional-hospital", priority: "critical" as const, deadlineMinutes: 60 },
  { id: "dialysis-central-01", originNodeId: "central-shelter", destinationNodeId: "regional-hospital", priority: "critical" as const, deadlineMinutes: 90 },
  { id: "trauma-west-01", originNodeId: "west-shelter", destinationNodeId: "regional-hospital", priority: "urgent" as const, deadlineMinutes: 120 },
  { id: "cardiac-mountain-01", originNodeId: "mountain-community", destinationNodeId: "regional-hospital", priority: "critical" as const, deadlineMinutes: 70 },
  { id: "injury-east-01", originNodeId: "east-shelter", destinationNodeId: "regional-hospital", priority: "urgent" as const, deadlineMinutes: 100 },
];

const AMBULANCES = [
  { id: "ambulance-alpha", baseNodeId: "regional-hospital" },
  { id: "ambulance-bravo", baseNodeId: "inland-command" },
  { id: "ambulance-charlie", baseNodeId: "east-depot" },
];

export const NANKAI_SEARCH_ZONES = [
  { id: "central-lowland-grid", label: "Synthetic central lowland search grid", targetNodeId: "central-shelter", areaKm2: 2.4, expectedPeople: 18, uncertainty: 0.88, accessDifficulty: 0.9, medical: false },
  { id: "coastal-hospital-perimeter", label: "Synthetic coastal hospital perimeter", targetNodeId: "coastal-hospital", areaKm2: 1.3, expectedPeople: 12, uncertainty: 0.82, accessDifficulty: 1, medical: true },
  { id: "mountain-slope-grid", label: "Synthetic mountain slope search grid", targetNodeId: "mountain-community", areaKm2: 2, expectedPeople: 9, uncertainty: 0.92, accessDifficulty: 1, medical: true },
  { id: "west-river-crossing", label: "Synthetic west river crossing grid", targetNodeId: "west-shelter", areaKm2: 1.2, expectedPeople: 6, uncertainty: 0.65, accessDifficulty: 0.7, medical: false },
  { id: "east-coast-grid", label: "Synthetic east coast search grid", targetNodeId: "east-shelter", areaKm2: 2.8, expectedPeople: 14, uncertainty: 0.78, accessDifficulty: 0.8, medical: false },
];

const DRONES = [
  { id: "drone-alpha", baseNodeId: "air-staging", enduranceMinutes: 42, speedKmh: 80, coverageKm2PerMinute: 0.5 },
  { id: "drone-bravo", baseNodeId: "inland-command", enduranceMinutes: 50, speedKmh: 70, coverageKm2PerMinute: 0.35 },
  { id: "drone-charlie", baseNodeId: "west-depot", enduranceMinutes: 38, speedKmh: 65, coverageKm2PerMinute: 0.4 },
];

interface ActiveRoad extends NankaiRoad { activeState: NankaiRoadState }

interface GraphEdge { to: string; roadId: string; minutes: number }

class MinHeap {
  private values: Array<{ nodeId: string; distance: number }> = [];

  push(value: { nodeId: string; distance: number }) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].distance <= value.distance) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    if (!this.values.length) return null;
    const root = this.values[0];
    const tail = this.values.pop()!;
    if (this.values.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right].distance < this.values[left].distance ? right : left;
        if (this.values[child].distance >= tail.distance) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = tail;
    }
    return root;
  }
}

function activeRoads(phase: NankaiPhase, interventionRoadId: string | null): ActiveRoad[] {
  if (interventionRoadId && !NANKAI_ROADS.some((road) => road.id === interventionRoadId)) throw new Error("Unknown road-clearance intervention");
  return NANKAI_ROADS.map((road) => ({
    ...road,
    activeState: road.id === interventionRoadId ? "open" : road.stateByPhase[phase],
  }));
}

function buildAdjacency(roads: ActiveRoad[]) {
  const adjacency = new Map(NANKAI_NODES.map((node) => [node.id, [] as GraphEdge[]]));
  for (const road of roads) {
    if (road.activeState === "blocked" || road.activeState === "unknown") continue;
    const minutes = road.minutes * (road.activeState === "degraded" ? 1.5 : 1);
    adjacency.get(road.from)!.push({ to: road.to, roadId: road.id, minutes });
    adjacency.get(road.to)!.push({ to: road.from, roadId: road.id, minutes });
  }
  return adjacency;
}

function makeRouter(roads: ActiveRoad[]) {
  const adjacency = buildAdjacency(roads);
  const cache = new Map<string, { distance: Map<string, number>; previous: Map<string, { nodeId: string; roadId: string }> }>();
  let runs = 0;
  let relaxations = 0;

  function run(source: string) {
    const existing = cache.get(source);
    if (existing) return existing;
    if (!adjacency.has(source)) throw new Error("Unknown route source");
    runs += 1;
    const distance = new Map(NANKAI_NODES.map((node) => [node.id, Number.POSITIVE_INFINITY]));
    const previous = new Map<string, { nodeId: string; roadId: string }>();
    distance.set(source, 0);
    const heap = new MinHeap();
    heap.push({ nodeId: source, distance: 0 });
    while (true) {
      const current = heap.pop();
      if (!current) break;
      if (current.distance !== distance.get(current.nodeId)) continue;
      for (const edge of adjacency.get(current.nodeId) ?? []) {
        relaxations += 1;
        const nextDistance = current.distance + edge.minutes;
        if (nextDistance >= (distance.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
        distance.set(edge.to, nextDistance);
        previous.set(edge.to, { nodeId: current.nodeId, roadId: edge.roadId });
        heap.push({ nodeId: edge.to, distance: nextDistance });
      }
    }
    const result = { distance, previous };
    cache.set(source, result);
    return result;
  }

  function route(source: string, target: string): NankaiRoute | null {
    const result = run(source);
    const minutes = result.distance.get(target);
    if (minutes === undefined || !Number.isFinite(minutes)) return null;
    const roadIds: string[] = [];
    let cursor = target;
    while (cursor !== source) {
      const step = result.previous.get(cursor);
      if (!step) return null;
      roadIds.push(step.roadId);
      cursor = step.nodeId;
    }
    return { minutes: Number(minutes.toFixed(1)), roadIds: roadIds.reverse() };
  }

  return { route, stats: () => ({ runs, relaxations }) };
}

interface FlowEdge { to: number; reverse: number; capacity: number; initialCapacity: number; cost: number }

function addFlowEdge(graph: FlowEdge[][], from: number, to: number, capacity: number, cost: number) {
  const forwardIndex = graph[from].length;
  const reverseIndex = graph[to].length;
  graph[from].push({ to, reverse: reverseIndex, capacity, initialCapacity: capacity, cost });
  graph[to].push({ to: from, reverse: forwardIndex, capacity: 0, initialCapacity: 0, cost: -cost });
  return forwardIndex;
}

function solveCommodityFlow(commodity: NankaiCommodity, router: ReturnType<typeof makeRouter>) {
  const source = 0;
  const depotStart = 1;
  const siteStart = depotStart + SUPPLY_DEPOTS.length;
  const sink = siteStart + SUPPLY_DEMANDS.length;
  const graph: FlowEdge[][] = Array.from({ length: sink + 1 }, () => []);
  SUPPLY_DEPOTS.forEach((depot, index) => addFlowEdge(graph, source, depotStart + index, depot.inventory[commodity], 0));
  SUPPLY_DEMANDS.forEach((demand, index) => addFlowEdge(graph, siteStart + index, sink, demand.demand[commodity], 0));
  const refs: Array<{ from: number; edgeIndex: number; depotId: string; siteId: string; route: NankaiRoute }> = [];
  SUPPLY_DEPOTS.forEach((depot, depotIndex) => {
    SUPPLY_DEMANDS.forEach((demand, siteIndex) => {
      const route = router.route(depot.nodeId, demand.nodeId);
      if (!route) return;
      const priorityPenalty = (5 - demand.priority) * 1_000;
      const edgeIndex = addFlowEdge(graph, depotStart + depotIndex, siteStart + siteIndex, demand.demand[commodity], Math.round(route.minutes * 10) + priorityPenalty);
      refs.push({ from: depotStart + depotIndex, edgeIndex, depotId: depot.nodeId, siteId: demand.nodeId, route });
    });
  });

  let augmentations = 0;
  let relaxations = 0;
  while (true) {
    const distance = Array(graph.length).fill(Number.POSITIVE_INFINITY) as number[];
    const previousNode = new Int32Array(graph.length);
    const previousEdge = new Int32Array(graph.length);
    previousNode.fill(-1);
    previousEdge.fill(-1);
    distance[source] = 0;
    for (let iteration = 0; iteration < graph.length - 1; iteration += 1) {
      let changed = false;
      for (let node = 0; node < graph.length; node += 1) {
        if (!Number.isFinite(distance[node])) continue;
        for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex += 1) {
          const edge = graph[node][edgeIndex];
          if (edge.capacity <= 0) continue;
          relaxations += 1;
          const candidate = distance[node] + edge.cost;
          if (candidate >= distance[edge.to]) continue;
          distance[edge.to] = candidate;
          previousNode[edge.to] = node;
          previousEdge[edge.to] = edgeIndex;
          changed = true;
        }
      }
      if (!changed) break;
    }
    if (previousNode[sink] === -1) break;
    let amount = Number.POSITIVE_INFINITY;
    for (let node = sink; node !== source; node = previousNode[node]) amount = Math.min(amount, graph[previousNode[node]][previousEdge[node]].capacity);
    for (let node = sink; node !== source; node = previousNode[node]) {
      const edge = graph[previousNode[node]][previousEdge[node]];
      edge.capacity -= amount;
      graph[node][edge.reverse].capacity += amount;
    }
    augmentations += 1;
  }

  const assignments = refs.map((ref) => {
    const edge = graph[ref.from][ref.edgeIndex];
    return { commodity, depotId: ref.depotId, siteId: ref.siteId, units: edge.initialCapacity - edge.capacity, route: ref.route };
  }).filter((assignment) => assignment.units > 0);
  const deliveredBySite = new Map<string, number>();
  for (const assignment of assignments) deliveredBySite.set(assignment.siteId, (deliveredBySite.get(assignment.siteId) ?? 0) + assignment.units);
  const requestedUnits = SUPPLY_DEMANDS.reduce((sum, demand) => sum + demand.demand[commodity], 0);
  const deliveredUnits = assignments.reduce((sum, assignment) => sum + assignment.units, 0);
  const unmetBySite = SUPPLY_DEMANDS.map((demand) => ({ siteId: demand.nodeId, units: Math.max(0, demand.demand[commodity] - (deliveredBySite.get(demand.nodeId) ?? 0)) })).filter((item) => item.units > 0);
  return {
    result: { commodity, requestedUnits, deliveredUnits, coveragePercent: Number(((deliveredUnits / requestedUnits) * 100).toFixed(1)), unmetBySite, assignments },
    augmentations,
    relaxations,
  };
}

function planSupplies(router: ReturnType<typeof makeRouter>): NankaiSupplyResult {
  const solved = COMMODITIES.map((commodity) => solveCommodityFlow(commodity, router));
  const totalRequestedUnits = solved.reduce((sum, item) => sum + item.result.requestedUnits, 0);
  const totalDeliveredUnits = solved.reduce((sum, item) => sum + item.result.deliveredUnits, 0);
  const weightedRequested = solved.reduce((sum, item) => sum + item.result.requestedUnits * (item.result.commodity === "medicine_kits" ? 10 : item.result.commodity === "water_100l" ? 3 : 1), 0);
  const weightedDelivered = solved.reduce((sum, item) => sum + item.result.deliveredUnits * (item.result.commodity === "medicine_kits" ? 10 : item.result.commodity === "water_100l" ? 3 : 1), 0);
  return {
    commodities: solved.map((item) => item.result),
    totalRequestedUnits,
    totalDeliveredUnits,
    weightedCoveragePercent: Number(((weightedDelivered / weightedRequested) * 100).toFixed(1)),
    evidence: {
      algorithm: "successive shortest augmenting path min-cost flow",
      augmentations: solved.reduce((sum, item) => sum + item.augmentations, 0),
      relaxations: solved.reduce((sum, item) => sum + item.relaxations, 0),
    },
  };
}

function planPower(router: ReturnType<typeof makeRouter>): NankaiPowerResult {
  let best: { choices: Array<number | null>; objective: [number, number, number, number] } | null = null;
  let candidatesEvaluated = 0;
  const choices = Array<number | null>(POWER_ASSETS.length).fill(null);

  function evaluate() {
    candidatesEvaluated += 1;
    const suppliedEnergy = Array(POWER_SITES.length).fill(0) as number[];
    const suppliedOutput = Array(POWER_SITES.length).fill(0) as number[];
    let travelMinutes = 0;
    choices.forEach((siteIndex, assetIndex) => {
      if (siteIndex === null) return;
      suppliedEnergy[siteIndex] += POWER_ASSETS[assetIndex].energyKwh;
      suppliedOutput[siteIndex] += POWER_ASSETS[assetIndex].outputKw;
      travelMinutes += router.route(POWER_ASSETS[assetIndex].baseNodeId, POWER_SITES[siteIndex].nodeId)?.minutes ?? 0;
    });
    let criticalGaps = 0;
    let weightedUnmet = 0;
    let metSites = 0;
    POWER_SITES.forEach((site, index) => {
      const energyGap = Math.max(0, site.requiredEnergyKwh - suppliedEnergy[index]);
      const outputGap = Math.max(0, site.requiredOutputKw - suppliedOutput[index]);
      const met = energyGap === 0 && outputGap === 0;
      if (met) metSites += 1;
      if (!met && site.priority === 5) criticalGaps += 1;
      weightedUnmet += (energyGap + outputGap * 4) * site.priority * site.priority;
    });
    const objective: [number, number, number, number] = [criticalGaps, weightedUnmet, -metSites, travelMinutes];
    if (!best || objective.some((value, index) => value < best!.objective[index] && objective.slice(0, index).every((prefix, prefixIndex) => prefix === best!.objective[prefixIndex]))) {
      best = { choices: [...choices], objective };
    }
  }

  function search(assetIndex: number) {
    if (assetIndex === POWER_ASSETS.length) return evaluate();
    choices[assetIndex] = null;
    search(assetIndex + 1);
    POWER_SITES.forEach((site, siteIndex) => {
      if (!router.route(POWER_ASSETS[assetIndex].baseNodeId, site.nodeId)) return;
      choices[assetIndex] = siteIndex;
      search(assetIndex + 1);
    });
    choices[assetIndex] = null;
  }
  search(0);
  if (!best) throw new Error("Power assignment search produced no candidate");
  const winningChoices = (best as { choices: Array<number | null>; objective: [number, number, number, number] }).choices;
  const assignments = winningChoices.map((siteIndex, assetIndex) => {
    if (siteIndex === null) return null;
    const asset = POWER_ASSETS[assetIndex];
    const site = POWER_SITES[siteIndex];
    return { assetId: asset.id, siteId: site.nodeId, energyKwh: asset.energyKwh, outputKw: asset.outputKw, route: router.route(asset.baseNodeId, site.nodeId)! };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const sites = POWER_SITES.map((site) => {
    const siteAssignments = assignments.filter((assignment) => assignment.siteId === site.nodeId);
    const suppliedEnergyKwh = siteAssignments.reduce((sum, assignment) => sum + assignment.energyKwh, 0);
    const suppliedOutputKw = siteAssignments.reduce((sum, assignment) => sum + assignment.outputKw, 0);
    return { siteId: site.nodeId, requiredEnergyKwh: site.requiredEnergyKwh, suppliedEnergyKwh, requiredOutputKw: site.requiredOutputKw, suppliedOutputKw, met: suppliedEnergyKwh >= site.requiredEnergyKwh && suppliedOutputKw >= site.requiredOutputKw, priority: site.priority };
  });
  return {
    sites,
    assignments,
    criticalGaps: sites.filter((site) => site.priority === 5 && !site.met).length,
    weightedUnmetKwh: Number(sites.reduce((sum, site) => sum + Math.max(0, site.requiredEnergyKwh - site.suppliedEnergyKwh) * site.priority * site.priority, 0).toFixed(1)),
    candidatesEvaluated,
  };
}

function feasibleMedicalMission(router: ReturnType<typeof makeRouter>, vehicleIndex: number, caseIndex: number) {
  const vehicle = AMBULANCES[vehicleIndex];
  const medicalCase = MEDICAL_CASES[caseIndex];
  const toOrigin = router.route(vehicle.baseNodeId, medicalCase.originNodeId);
  const toHospital = router.route(medicalCase.originNodeId, medicalCase.destinationNodeId);
  if (!toOrigin || !toHospital) return null;
  const totalMinutes = toOrigin.minutes + 12 + toHospital.minutes;
  if (totalMinutes > medicalCase.deadlineMinutes) return null;
  return { totalMinutes: Number(totalMinutes.toFixed(1)), roadIds: [...toOrigin.roadIds, ...toHospital.roadIds] };
}

function planMedical(router: ReturnType<typeof makeRouter>): NankaiMedicalResult {
  const choices = Array<number | null>(AMBULANCES.length).fill(null);
  let best: { choices: Array<number | null>; objective: [number, number, number] } | null = null;
  let candidatesEvaluated = 0;

  function evaluate() {
    candidatesEvaluated += 1;
    let score = 0;
    let rescued = 0;
    let totalMinutes = 0;
    choices.forEach((caseIndex, vehicleIndex) => {
      if (caseIndex === null) return;
      const mission = feasibleMedicalMission(router, vehicleIndex, caseIndex);
      if (!mission) return;
      score += MEDICAL_CASES[caseIndex].priority === "critical" ? 100 : 10;
      rescued += 1;
      totalMinutes += mission.totalMinutes;
    });
    const objective: [number, number, number] = [-score, -rescued, totalMinutes];
    if (!best || objective.some((value, index) => value < best!.objective[index] && objective.slice(0, index).every((prefix, prefixIndex) => prefix === best!.objective[prefixIndex]))) best = { choices: [...choices], objective };
  }

  function search(vehicleIndex: number, usedCases: Set<number>) {
    if (vehicleIndex === AMBULANCES.length) return evaluate();
    choices[vehicleIndex] = null;
    search(vehicleIndex + 1, usedCases);
    MEDICAL_CASES.forEach((_, caseIndex) => {
      if (usedCases.has(caseIndex) || !feasibleMedicalMission(router, vehicleIndex, caseIndex)) return;
      usedCases.add(caseIndex);
      choices[vehicleIndex] = caseIndex;
      search(vehicleIndex + 1, usedCases);
      usedCases.delete(caseIndex);
    });
    choices[vehicleIndex] = null;
  }
  search(0, new Set());
  if (!best) throw new Error("Medical assignment search produced no candidate");
  const winningChoices = (best as { choices: Array<number | null>; objective: [number, number, number] }).choices;
  const groundAssignments = winningChoices.map((caseIndex, vehicleIndex) => {
    if (caseIndex === null) return null;
    const mission = feasibleMedicalMission(router, vehicleIndex, caseIndex)!;
    return { vehicleId: AMBULANCES[vehicleIndex].id, caseId: MEDICAL_CASES[caseIndex].id, totalMinutes: mission.totalMinutes, deadlineMinutes: MEDICAL_CASES[caseIndex].deadlineMinutes, roadIds: mission.roadIds };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const assignedCaseIds = new Set(groundAssignments.map((assignment) => assignment.caseId));
  const unresolved = MEDICAL_CASES.filter((medicalCase) => !assignedCaseIds.has(medicalCase.id)).map((medicalCase, caseIndex) => {
    const routeExists = AMBULANCES.some((_, vehicleIndex) => feasibleMedicalMission(router, vehicleIndex, caseIndex));
    return {
      caseId: medicalCase.id,
      originNodeId: medicalCase.originNodeId,
      priority: medicalCase.priority,
      recommendedMode: routeExists ? "ground_waitlist" as const : "air_coordination_request" as const,
      reason: routeExists ? "A feasible ground route exists, but the bounded ambulance set is committed." : "No bounded ground mission reaches the receiving hospital before the case deadline.",
    };
  });
  return {
    groundAssignments,
    unresolved,
    criticalGroundTransfers: groundAssignments.filter((assignment) => MEDICAL_CASES.find((medicalCase) => medicalCase.id === assignment.caseId)?.priority === "critical").length,
    casesPlanned: groundAssignments.length,
    candidatesEvaluated,
  };
}

function haversineKm(fromNodeId: string, toNodeId: string) {
  const from = NANKAI_NODES.find((node) => node.id === fromNodeId)!;
  const to = NANKAI_NODES.find((node) => node.id === toNodeId)!;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function planDrones(router: ReturnType<typeof makeRouter>): NankaiDroneResult {
  const choices = Array<number | null>(DRONES.length).fill(null);
  const zoneScores = NANKAI_SEARCH_ZONES.map((zone) => {
    const groundInaccessible = router.route("inland-command", zone.targetNodeId) === null;
    return Number((zone.expectedPeople * zone.uncertainty * (1 + zone.accessDifficulty) * (groundInaccessible ? 1.45 : 0.6) + (zone.medical ? 25 : 0)).toFixed(2));
  });
  let best: { choices: Array<number | null>; objective: [number, number, number] } | null = null;
  let candidatesEvaluated = 0;

  function mission(droneIndex: number, zoneIndex: number) {
    const drone = DRONES[droneIndex];
    const zone = NANKAI_SEARCH_ZONES[zoneIndex];
    const transitMinutes = (haversineKm(drone.baseNodeId, zone.targetNodeId) / drone.speedKmh) * 60 * 2;
    const searchMinutes = zone.areaKm2 / drone.coverageKm2PerMinute;
    const totalMinutes = transitMinutes + searchMinutes + 4;
    return totalMinutes <= drone.enduranceMinutes ? Number(totalMinutes.toFixed(1)) : null;
  }

  function evaluate() {
    candidatesEvaluated += 1;
    let score = 0;
    let covered = 0;
    let minutes = 0;
    choices.forEach((zoneIndex, droneIndex) => {
      if (zoneIndex === null) return;
      const totalMinutes = mission(droneIndex, zoneIndex);
      if (totalMinutes === null) return;
      score += zoneScores[zoneIndex];
      covered += 1;
      minutes += totalMinutes;
    });
    const objective: [number, number, number] = [-score, -covered, minutes];
    if (!best || objective.some((value, index) => value < best!.objective[index] && objective.slice(0, index).every((prefix, prefixIndex) => prefix === best!.objective[prefixIndex]))) best = { choices: [...choices], objective };
  }

  function search(droneIndex: number, usedZones: Set<number>) {
    if (droneIndex === DRONES.length) return evaluate();
    choices[droneIndex] = null;
    search(droneIndex + 1, usedZones);
    NANKAI_SEARCH_ZONES.forEach((_, zoneIndex) => {
      if (usedZones.has(zoneIndex) || mission(droneIndex, zoneIndex) === null) return;
      usedZones.add(zoneIndex);
      choices[droneIndex] = zoneIndex;
      search(droneIndex + 1, usedZones);
      usedZones.delete(zoneIndex);
    });
    choices[droneIndex] = null;
  }
  search(0, new Set());
  if (!best) throw new Error("Drone assignment search produced no candidate");
  const winningChoices = (best as { choices: Array<number | null>; objective: [number, number, number] }).choices;
  const assignments = winningChoices.map((zoneIndex, droneIndex) => {
    if (zoneIndex === null) return null;
    const drone = DRONES[droneIndex];
    const zone = NANKAI_SEARCH_ZONES[zoneIndex];
    return { droneId: drone.id, zoneId: zone.id, score: zoneScores[zoneIndex], totalMinutes: mission(droneIndex, zoneIndex)!, baseNodeId: drone.baseNodeId, targetNodeId: zone.targetNodeId };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const assignedZoneIds = new Set(assignments.map((assignment) => assignment.zoneId));
  const totalScore = zoneScores.reduce((sum, score) => sum + score, 0);
  const assignedScore = assignments.reduce((sum, assignment) => sum + assignment.score, 0);
  return {
    assignments,
    unsearchedZoneIds: NANKAI_SEARCH_ZONES.filter((zone) => !assignedZoneIds.has(zone.id)).map((zone) => zone.id),
    weightedCoveragePercent: Number(((assignedScore / totalScore) * 100).toFixed(1)),
    candidatesEvaluated,
  };
}

function networkIndicators(phase: NankaiPhase, interventionRoadId: string | null) {
  const router = makeRouter(activeRoads(phase, interventionRoadId));
  const reachableServiceSites = SUPPLY_DEMANDS.filter((demand) => SUPPLY_DEPOTS.some((depot) => router.route(depot.nodeId, demand.nodeId))).map((demand) => demand.nodeId);
  const reachableCriticalSites = POWER_SITES.filter((site) => site.priority >= 4 && POWER_ASSETS.some((asset) => router.route(asset.baseNodeId, site.nodeId))).map((site) => site.nodeId);
  const feasibleMedicalCases = MEDICAL_CASES.filter((_, caseIndex) => AMBULANCES.some((_, vehicleIndex) => feasibleMedicalMission(router, vehicleIndex, caseIndex))).map((medicalCase) => medicalCase.id);
  return { reachableServiceSites, reachableCriticalSites, feasibleMedicalCases };
}

function rankClearance(phase: NankaiPhase): NankaiClearancePriority[] {
  const baseline = networkIndicators(phase, null);
  const baselineService = new Set(baseline.reachableServiceSites);
  const baselineCritical = new Set(baseline.reachableCriticalSites);
  const baselineMedical = new Set(baseline.feasibleMedicalCases);
  return NANKAI_ROADS.filter((road) => road.stateByPhase[phase] === "blocked" || road.stateByPhase[phase] === "unknown").map((road) => {
    const after = networkIndicators(phase, road.id);
    const restoredServiceSites = after.reachableServiceSites.filter((id) => !baselineService.has(id)).length;
    const restoredCriticalSites = after.reachableCriticalSites.filter((id) => !baselineCritical.has(id)).length;
    const restoredMedicalCases = after.feasibleMedicalCases.filter((id) => !baselineMedical.has(id)).length;
    return {
      rank: 0,
      road,
      baseState: road.stateByPhase[phase] as "unknown" | "blocked",
      restoredServiceSites,
      restoredMedicalCases,
      restoredCriticalSites,
      score: restoredCriticalSites * 120 + restoredMedicalCases * 90 + restoredServiceSites * 35 - road.clearanceMinutes * 0.2,
    };
  }).sort((left, right) => right.score - left.score || left.road.id.localeCompare(right.road.id)).map((item, index) => ({ ...item, rank: index + 1, score: Number(item.score.toFixed(1)) }));
}

export function analyzeNankaiResponse(phase: NankaiPhase = "first_6_hours", interventionRoadId: string | null = null): NankaiResponseAnalysis {
  if (!NANKAI_PHASES.some((item) => item.id === phase)) throw new Error("Unsupported response phase");
  const roads = activeRoads(phase, interventionRoadId);
  const router = makeRouter(roads);
  const supply = planSupplies(router);
  const power = planPower(router);
  const medical = planMedical(router);
  const drone = planDrones(router);
  const clearancePriorities = rankClearance(phase);
  const isolatedNodeIds = NANKAI_NODES.filter((node) => node.id !== "inland-command" && !router.route("inland-command", node.id)).map((node) => node.id);
  const routingStats = router.stats();
  return {
    schemaVersion: NANKAI_RESPONSE_SCHEMA_VERSION,
    scenarioLabel: "Synthetic Kochi coastal Nankai Trough maximum-class tabletop",
    phase,
    interventionRoadId,
    nodes: NANKAI_NODES,
    roads,
    supply,
    power,
    medical,
    drone,
    clearancePriorities,
    isolatedNodeIds,
    metrics: {
      supplyCoveragePercent: supply.weightedCoveragePercent,
      powerCriticalGaps: power.criticalGaps,
      medicalCasesPlanned: medical.casesPlanned,
      medicalAirRequests: medical.unresolved.filter((item) => item.recommendedMode === "air_coordination_request").length,
      droneZonesCovered: drone.assignments.length,
      inaccessibleLocations: isolatedNodeIds.length,
    },
    evidence: {
      roadDijkstraRuns: routingStats.runs,
      roadRelaxations: routingStats.relaxations,
      clearanceCounterfactuals: clearancePriorities.length,
      minCostFlowAugmentations: supply.evidence.augmentations,
      exactPowerAssignments: power.candidatesEvaluated,
      exactMedicalAssignments: medical.candidatesEvaluated,
      exactDroneAssignments: drone.candidatesEvaluated,
    },
    gates: {
      tabletop: "synthetic_ready",
      fieldOperation: "blocked",
      autonomousDispatch: "prohibited",
      medicalAndAirTasking: "human_authority_required",
    },
  };
}

export async function buildNankaiEvidence(analysis: NankaiResponseAnalysis) {
  const evidence = {
    schemaVersion: analysis.schemaVersion,
    scenarioLabel: analysis.scenarioLabel,
    phase: analysis.phase,
    interventionRoadId: analysis.interventionRoadId,
    roadState: analysis.roads.map((road) => ({ id: road.id, state: road.activeState })),
    metrics: analysis.metrics,
    supply: analysis.supply.commodities.map((commodity) => ({ commodity: commodity.commodity, requestedUnits: commodity.requestedUnits, deliveredUnits: commodity.deliveredUnits, unmetBySite: commodity.unmetBySite })),
    power: { criticalGaps: analysis.power.criticalGaps, assignments: analysis.power.assignments.map((assignment) => ({ assetId: assignment.assetId, siteId: assignment.siteId })) },
    medical: { groundAssignments: analysis.medical.groundAssignments, unresolved: analysis.medical.unresolved },
    drone: { assignments: analysis.drone.assignments, unsearchedZoneIds: analysis.drone.unsearchedZoneIds },
    clearancePriorities: analysis.clearancePriorities.map((item) => ({ rank: item.rank, roadId: item.road.id, score: item.score, restoredServiceSites: item.restoredServiceSites, restoredMedicalCases: item.restoredMedicalCases, restoredCriticalSites: item.restoredCriticalSites })),
    algorithmEvidence: analysis.evidence,
    gates: analysis.gates,
    officialBasis: [
      "Cabinet Office large-scale earthquake and tsunami emergency response policy, revised 2026-07-13",
      "Cabinet Office Kochi isolated-community support drill report, 2025",
      "Cabinet Office Nankai Trough maximum-class damage assumptions, published 2025-03-31",
    ],
    boundary: "Synthetic tabletop optimization only. It does not ingest live hazard data, command vehicles or aircraft, diagnose roads, triage patients, or authorize field action.",
  };
  return { ...evidence, evidenceDigest: `sha256:${await sha256Hex(evidence)}` };
}
