export type Connector = "V2L" | "V2H" | "V2B";
export type Priority = "critical" | "high" | "standard";

export interface PowerNeed {
  id: "clinic" | "shelter" | "water";
  facility: string;
  summary: string;
  report: string;
  sourceQuote: string;
  powerKw: number;
  peakPowerKw?: number;
  durationHours: number;
  deadlineMinutes: number;
  priority: Priority;
  connector: Connector;
  confidence: number;
  assumptions: string[];
  x: number;
  y: number;
}

export type DecisionAnswerId = "confirmed" | "adverse";

export interface DecisionQuestionOption {
  id: DecisionAnswerId;
  label: string;
  detail: string;
  adjustedValue: number;
  assignments: Record<PowerNeed["id"], string>;
  successRate: number;
  violationScenarios: number;
  unresolvedPlanViolationScenarios: number;
  avoidedViolationScenarios: number;
}

export interface DecisionQuestion {
  id: string;
  needId: PowerNeed["id"];
  facility: string;
  question: string;
  assumption: string;
  field: "powerKw" | "peakPowerKw" | "durationHours";
  fieldLabel: string;
  priority: Priority;
  rank: number;
  score: number;
  assignmentChanges: number;
  avoidableViolationScenarios: number;
  expectedAvoidedViolationScenarios: number;
  options: [DecisionQuestionOption, DecisionQuestionOption];
}

export interface DecisionAnalysis {
  algorithm: "Exact counterfactual value-of-information ranking";
  questionCount: number;
  counterfactualPlanScenarioEvaluations: number;
  topQuestion: DecisionQuestion;
  questions: DecisionQuestion[];
}

export interface Vehicle {
  id: string;
  capacityKwh: number;
  soc: number;
  reserveSoc: number;
  efficiency: number;
  travelKwhPerKm: number;
  maxPowerKw: number;
  connectors: Connector[];
  x: number;
  y: number;
}

export interface RouteOption {
  vehicleId: string;
  needId: PowerNeed["id"];
  routeId: string;
  routeLabel: string;
  roundTripKm: number;
  oneWayMinutes: number;
}

export interface PlanningContext {
  unavailableVehicleIds?: string[];
  vehicleOverrides?: Record<string, Partial<Vehicle>>;
  routeOverrides?: Record<string, Partial<RouteOption>>;
}

export interface SafetyCheck {
  code: "route" | "connector" | "power" | "deadline" | "duration" | "reserve";
  label: string;
  detail: string;
  pass: boolean;
}

export interface Assignment {
  vehicle: Vehicle;
  need: PowerNeed;
  route: RouteOption;
  demandKwh: number;
  usableKwh: number;
  coverageHours: number;
  postMissionSoc: number;
  reserveMargin: number;
  effectiveOneWayMinutes: number;
  checks: SafetyCheck[];
  safe: boolean;
}

export interface StressResult {
  scenarioCount: number;
  successfulScenarios: number;
  successRate: number;
  violationScenarios: number;
  criticalSuccessfulScenarios: number;
  criticalSuccessRate: number;
  criticalViolationScenarios: number;
  worstUnservedKwh: number;
  meanUnservedKwh: number;
  worstUnservedCriticalKwh: number;
  meanUnservedCriticalKwh: number;
  worstReserveMargin: number;
}

export interface OptimizationEvidence {
  algorithm: "Exact lexicographic search + Halton stress test";
  objective: string[];
  candidatePlans: number;
  robustFeasiblePlans: number;
  scenarioEvaluations: number;
  scenarioCount: number;
  optimalityCertified: boolean;
  adversarialBounds: {
    demand: string;
    soc: string;
    travel: string;
  };
  baseline: StressResult;
  optimized: StressResult;
}

export interface DispatchPlan {
  assignments: Assignment[];
  blockedRoutes: string[];
  violationCount: number;
  unservedCriticalKwh: number;
  criticalSiteHours: number;
  allNeedsServed: boolean;
  optimization?: OptimizationEvidence;
}

export type ContingencyKind = "vehicle-loss" | "route-closure";

export interface ContingencyCase {
  id: string;
  kind: ContingencyKind;
  label: string;
  detail: string;
  criticalServiceProtected: boolean;
  criticalSuccessRate: number;
  fullMissionSuccessRate: number;
  criticalViolationScenarios: number;
  unservedCriticalKwh: number;
  missionChanges: number;
  assignments: Record<PowerNeed["id"], string>;
  candidatePlans: number;
  planScenarioEvaluations: number;
}

export interface PreparednessActionResult {
  id: string;
  label: string;
  detail: string;
  reserveVehicleId?: string;
  actionCost: number;
  actionCostLabel: string;
  protectedContingencies: number;
  protectionRate: number;
  worstCriticalSuccessRate: number;
  nMinusOneCertified: boolean;
  planScenarioEvaluations: number;
  cases: ContingencyCase[];
}

export interface ResilienceAnalysis {
  algorithm: "Exact N-1 contingency search + minimum-intervention selection";
  contingencyCount: number;
  actionCount: number;
  totalPlanScenarioEvaluations: number;
  baseline: PreparednessActionResult;
  selectedAction: PreparednessActionResult;
  candidateActions: PreparednessActionResult[];
  eliminatedSinglePoints: number;
  weakestBaselineCases: ContingencyCase[];
}

interface ScenarioVariation {
  demandScale: number;
  socDelta: number;
  travelScale: number;
}

export const DEFAULT_NEEDS: PowerNeed[] = [
  {
    id: "clinic",
    facility: "Riverside Clinic",
    summary: "Medication refrigeration offline",
    report: "Medication refrigeration is offline. We need 0.9 kW for 8 hours, with power arriving within 45 minutes. A V2L inlet is ready.",
    sourceQuote: "0.9 kW for 8 hours ... within 45 minutes",
    powerKw: 0.9,
    durationHours: 8,
    deadlineMinutes: 45,
    priority: "critical",
    connector: "V2L",
    confidence: 0.96,
    assumptions: ["Load remains stable for the stated window"],
    x: 17,
    y: 22,
  },
  {
    id: "shelter",
    facility: "North Shelter",
    summary: "Lighting and communications at risk",
    report: "The shelter needs 2.4 kW for lighting and communications for the next 6 hours. V2L is available. Arrival within 75 minutes is acceptable.",
    sourceQuote: "2.4 kW ... for the next 6 hours",
    powerKw: 2.4,
    durationHours: 6,
    deadlineMinutes: 75,
    priority: "high",
    connector: "V2L",
    confidence: 0.93,
    assumptions: ["No space-heating load is included"],
    x: 58,
    y: 16,
  },
  {
    id: "water",
    facility: "East Water Station",
    summary: "Pump controls without backup power",
    report: "Control and pump equipment requires 4.2 kW for 4 hours. Power is needed within 55 minutes and the V2H interface has been checked.",
    sourceQuote: "4.2 kW for 4 hours ... V2H interface",
    powerKw: 4.2,
    peakPowerKw: 4.2,
    durationHours: 4,
    deadlineMinutes: 55,
    priority: "critical",
    connector: "V2H",
    confidence: 0.98,
    assumptions: ["Pump start-up surge is handled on site"],
    x: 86,
    y: 68,
  },
];

export const VEHICLES: Vehicle[] = [
  {
    id: "E-07",
    capacityKwh: 62,
    soc: 78,
    reserveSoc: 35,
    efficiency: 0.92,
    travelKwhPerKm: 0.2,
    maxPowerKw: 3.6,
    connectors: ["V2L"],
    x: 24,
    y: 62,
  },
  {
    id: "E-12",
    capacityKwh: 44,
    soc: 46,
    reserveSoc: 35,
    efficiency: 0.92,
    travelKwhPerKm: 0.2,
    maxPowerKw: 3.6,
    connectors: ["V2L"],
    x: 42,
    y: 30,
  },
  {
    id: "E-21",
    capacityKwh: 82,
    soc: 82,
    reserveSoc: 35,
    efficiency: 0.92,
    travelKwhPerKm: 0.2,
    maxPowerKw: 6,
    connectors: ["V2L", "V2H"],
    x: 66,
    y: 55,
  },
  {
    id: "E-32",
    capacityKwh: 74,
    soc: 64,
    reserveSoc: 35,
    efficiency: 0.92,
    travelKwhPerKm: 0.2,
    maxPowerKw: 3.6,
    connectors: ["V2L"],
    x: 80,
    y: 28,
  },
  {
    id: "E-44",
    capacityKwh: 90,
    soc: 75,
    reserveSoc: 35,
    efficiency: 0.92,
    travelKwhPerKm: 0.2,
    maxPowerKw: 7.2,
    connectors: ["V2L", "V2H", "V2B"],
    x: 70,
    y: 82,
  },
];

const ROUTES: RouteOption[] = [
  { vehicleId: "E-07", needId: "clinic", routeId: "river-road", routeLabel: "River Road", roundTripKm: 14, oneWayMinutes: 32 },
  { vehicleId: "E-07", needId: "shelter", routeId: "north-link", routeLabel: "North Link", roundTripKm: 24, oneWayMinutes: 58 },
  { vehicleId: "E-07", needId: "water", routeId: "east-bridge", routeLabel: "East Bridge", roundTripKm: 40, oneWayMinutes: 70 },
  { vehicleId: "E-12", needId: "clinic", routeId: "clinic-cut", routeLabel: "Clinic Cut", roundTripKm: 17, oneWayMinutes: 22 },
  { vehicleId: "E-12", needId: "shelter", routeId: "north-link", routeLabel: "North Link", roundTripKm: 18, oneWayMinutes: 35 },
  { vehicleId: "E-12", needId: "water", routeId: "east-bridge", routeLabel: "East Bridge", roundTripKm: 30, oneWayMinutes: 48 },
  { vehicleId: "E-21", needId: "clinic", routeId: "river-road", routeLabel: "River Road", roundTripKm: 42, oneWayMinutes: 62 },
  { vehicleId: "E-21", needId: "shelter", routeId: "north-link", routeLabel: "North Link", roundTripKm: 20, oneWayMinutes: 31 },
  { vehicleId: "E-21", needId: "water", routeId: "east-bridge", routeLabel: "East Bridge", roundTripKm: 10, oneWayMinutes: 18 },
  { vehicleId: "E-32", needId: "clinic", routeId: "river-road", routeLabel: "River Road", roundTripKm: 34, oneWayMinutes: 50 },
  { vehicleId: "E-32", needId: "shelter", routeId: "north-link", routeLabel: "North Link", roundTripKm: 16, oneWayMinutes: 24 },
  { vehicleId: "E-32", needId: "water", routeId: "east-bridge", routeLabel: "East Bridge", roundTripKm: 28, oneWayMinutes: 44 },
  { vehicleId: "E-44", needId: "clinic", routeId: "ridge-bypass", routeLabel: "Ridge Bypass", roundTripKm: 46, oneWayMinutes: 68 },
  { vehicleId: "E-44", needId: "shelter", routeId: "ridge-bypass", routeLabel: "Ridge Bypass", roundTripKm: 38, oneWayMinutes: 49 },
  { vehicleId: "E-44", needId: "water", routeId: "ridge-bypass", routeLabel: "Ridge Bypass", roundTripKm: 24, oneWayMinutes: 36 },
];

const NOMINAL: ScenarioVariation = { demandScale: 1, socDelta: 0, travelScale: 1 };
const ADVERSARIAL_CORNER: ScenarioVariation = { demandScale: 1.1, socDelta: -5, travelScale: 1.2 };
const STRESS_SCENARIO_COUNT = 256;

const round = (value: number, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

function routeKey(vehicleId: string, needId: PowerNeed["id"]) {
  return `${vehicleId}/${needId}`;
}

function getRoute(
  vehicleId: string,
  needId: PowerNeed["id"],
  context: PlanningContext = {},
): RouteOption {
  const route = ROUTES.find((candidate) => candidate.vehicleId === vehicleId && candidate.needId === needId);
  if (!route) throw new Error(`Missing synthetic route ${vehicleId}/${needId}`);
  return {
    ...route,
    ...(context.routeOverrides?.[routeKey(vehicleId, needId)] ?? {}),
    vehicleId,
    needId,
  };
}

function getAvailableVehicles(context: PlanningContext = {}) {
  const unavailable = new Set(context.unavailableVehicleIds ?? []);
  return VEHICLES
    .filter((vehicle) => !unavailable.has(vehicle.id))
    .map((vehicle) => ({
      ...vehicle,
      ...(context.vehicleOverrides?.[vehicle.id] ?? {}),
      id: vehicle.id,
    }));
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

export function buildStressScenarios(count = STRESS_SCENARIO_COUNT): ScenarioVariation[] {
  return Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    return {
      demandScale: 0.9 + halton(index, 2) * 0.2,
      socDelta: -5 + halton(index, 3) * 10,
      travelScale: 0.8 + halton(index, 5) * 0.4,
    };
  });
}

export function evaluateAssignment(
  vehicle: Vehicle,
  need: PowerNeed,
  blockedRoutes: string[] = [],
  variation: ScenarioVariation = NOMINAL,
  context: PlanningContext = {},
): Assignment {
  const route = getRoute(vehicle.id, need.id, context);
  const startingSoc = Math.max(0, Math.min(100, vehicle.soc + variation.socDelta));
  const requiredPowerKw = need.powerKw * variation.demandScale;
  const requiredPeakPowerKw = (need.peakPowerKw ?? need.powerKw) * variation.demandScale;
  const demandKwh = requiredPowerKw * need.durationHours;
  const travelEnergy = route.roundTripKm * variation.travelScale * vehicle.travelKwhPerKm;
  const effectiveOneWayMinutes = route.oneWayMinutes * variation.travelScale;
  const usableKwh = Math.max(
    0,
    vehicle.capacityKwh * ((startingSoc - vehicle.reserveSoc) / 100) * vehicle.efficiency - travelEnergy,
  );
  const coverageHours = Math.min(need.durationHours, usableKwh / requiredPowerKw);
  const postMissionSoc = startingSoc - (
    (demandKwh / vehicle.efficiency + travelEnergy) / vehicle.capacityKwh
  ) * 100;
  const routeOpen = !blockedRoutes.includes(route.routeId);

  const checks: SafetyCheck[] = [
    {
      code: "route",
      label: "Route availability",
      detail: routeOpen ? `${route.routeLabel} is open` : `${route.routeLabel} is closed`,
      pass: routeOpen,
    },
    {
      code: "connector",
      label: "Connector compatibility",
      detail: vehicle.connectors.includes(need.connector)
        ? `${vehicle.id} supports ${need.connector}`
        : `${need.connector} is not supported`,
      pass: vehicle.connectors.includes(need.connector),
    },
    {
      code: "power",
      label: "Power envelope",
      detail: `${vehicle.maxPowerKw.toFixed(1)} kW available / ${round(requiredPeakPowerKw)} kW peak required`,
      pass: vehicle.maxPowerKw + 0.001 >= requiredPeakPowerKw,
    },
    {
      code: "deadline",
      label: "Arrival deadline",
      detail: `${round(effectiveOneWayMinutes)} min travel / ${need.deadlineMinutes} min limit`,
      pass: effectiveOneWayMinutes <= need.deadlineMinutes + 0.001,
    },
    {
      code: "duration",
      label: "Required duration",
      detail: `${round(coverageHours)} h available / ${need.durationHours.toFixed(1)} h required`,
      pass: coverageHours + 0.001 >= need.durationHours,
    },
    {
      code: "reserve",
      label: "Mobility reserve",
      detail: `${round(postMissionSoc)}% after mission / ${vehicle.reserveSoc}% minimum`,
      pass: postMissionSoc + 0.001 >= vehicle.reserveSoc,
    },
  ];

  return {
    vehicle,
    need,
    route,
    demandKwh: round(demandKwh),
    usableKwh: round(usableKwh),
    coverageHours: round(coverageHours),
    postMissionSoc: round(postMissionSoc),
    reserveMargin: round(postMissionSoc - vehicle.reserveSoc),
    effectiveOneWayMinutes: round(effectiveOneWayMinutes),
    checks,
    safe: checks.every((check) => check.pass),
  };
}

function summarize(assignments: Assignment[], blockedRoutes: string[], needs: PowerNeed[]): DispatchPlan {
  const criticalNeeds = needs.filter((need) => need.priority === "critical");
  const criticalSiteHours = criticalNeeds.reduce((total, need) => {
    const assignment = assignments.find((item) => item.need.id === need.id && item.safe);
    return total + (assignment?.coverageHours ?? 0);
  }, 0);
  const unservedCriticalKwh = criticalNeeds.reduce((total, need) => {
    const assignment = assignments.find((item) => item.need.id === need.id && item.safe);
    return total + (assignment ? 0 : need.powerKw * need.durationHours);
  }, 0);

  return {
    assignments,
    blockedRoutes,
    violationCount: assignments.flatMap((assignment) => assignment.checks).filter((check) => !check.pass).length,
    unservedCriticalKwh: round(unservedCriticalKwh),
    criticalSiteHours: round(criticalSiteHours),
    allNeedsServed: assignments.length === needs.length && assignments.every((assignment) => assignment.safe),
  };
}

function assessFixedAssignments(
  assignments: Assignment[],
  needs: PowerNeed[],
  blockedRoutes: string[],
  scenarios: ScenarioVariation[],
  context: PlanningContext = {},
): StressResult {
  let successfulScenarios = 0;
  let criticalSuccessfulScenarios = 0;
  let totalUnserved = 0;
  let worstUnserved = 0;
  let totalCriticalUnserved = 0;
  let worstCriticalUnserved = 0;
  let worstReserveMargin = Number.POSITIVE_INFINITY;

  for (const scenario of scenarios) {
    const evaluated = assignments.map((assignment) => (
      evaluateAssignment(assignment.vehicle, assignment.need, blockedRoutes, scenario, context)
    ));
    const byNeed = new Map(evaluated.map((assignment) => [assignment.need.id, assignment]));
    const success = needs.every((need) => byNeed.get(need.id)?.safe === true);
    const criticalSuccess = needs
      .filter((need) => need.priority === "critical")
      .every((need) => byNeed.get(need.id)?.safe === true);
    if (success) successfulScenarios += 1;
    if (criticalSuccess) criticalSuccessfulScenarios += 1;

    const unserved = needs
      .reduce((total, need) => total + (byNeed.get(need.id)?.safe ? 0 : need.powerKw * need.durationHours * scenario.demandScale), 0);
    const criticalUnserved = needs
      .filter((need) => need.priority === "critical")
      .reduce((total, need) => total + (byNeed.get(need.id)?.safe ? 0 : need.powerKw * need.durationHours * scenario.demandScale), 0);
    totalUnserved += unserved;
    worstUnserved = Math.max(worstUnserved, unserved);
    totalCriticalUnserved += criticalUnserved;
    worstCriticalUnserved = Math.max(worstCriticalUnserved, criticalUnserved);
    for (const assignment of evaluated) {
      worstReserveMargin = Math.min(worstReserveMargin, assignment.reserveMargin);
    }
  }

  return {
    scenarioCount: scenarios.length,
    successfulScenarios,
    successRate: round((successfulScenarios / scenarios.length) * 100, 1),
    violationScenarios: scenarios.length - successfulScenarios,
    criticalSuccessfulScenarios,
    criticalSuccessRate: round((criticalSuccessfulScenarios / scenarios.length) * 100, 1),
    criticalViolationScenarios: scenarios.length - criticalSuccessfulScenarios,
    worstUnservedKwh: round(worstUnserved),
    meanUnservedKwh: round(totalUnserved / scenarios.length, 2),
    worstUnservedCriticalKwh: round(worstCriticalUnserved),
    meanUnservedCriticalKwh: round(totalCriticalUnserved / scenarios.length, 2),
    worstReserveMargin: round(worstReserveMargin),
  };
}

export function buildUnsafeCandidate(needs: PowerNeed[] = DEFAULT_NEEDS): DispatchPlan {
  const vehicleById = new Map(VEHICLES.map((vehicle) => [vehicle.id, vehicle]));
  const choices: Record<PowerNeed["id"], string> = {
    clinic: "E-12",
    shelter: "E-32",
    water: "E-21",
  };
  const assignments = needs.map((need) => evaluateAssignment(vehicleById.get(choices[need.id])!, need));
  return summarize(assignments, [], needs);
}

export function buildGreedyBaseline(
  blockedRoutes: string[] = [],
  needs: PowerNeed[] = DEFAULT_NEEDS,
  context: PlanningContext = {},
): DispatchPlan {
  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, standard: 2 };
  const orderedNeeds = [...needs].sort((a, b) => {
    const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
    return priorityDelta || a.deadlineMinutes - b.deadlineMinutes;
  });
  const usedVehicles = new Set<string>();
  const assignments: Assignment[] = [];

  for (const need of orderedNeeds) {
    const selected = getAvailableVehicles(context)
      .filter((vehicle) => !usedVehicles.has(vehicle.id))
      .map((vehicle) => evaluateAssignment(vehicle, need, blockedRoutes, NOMINAL, context))
      .filter((assignment) => assignment.safe)
      .sort((a, b) => (
        a.route.oneWayMinutes - b.route.oneWayMinutes
        || b.postMissionSoc - a.postMissionSoc
        || a.vehicle.id.localeCompare(b.vehicle.id)
      ))[0];
    if (selected) {
      assignments.push(selected);
      usedVehicles.add(selected.vehicle.id);
    }
  }

  assignments.sort((a, b) => needs.findIndex((need) => need.id === a.need.id) - needs.findIndex((need) => need.id === b.need.id));
  return summarize(assignments, blockedRoutes, needs);
}

interface CandidateScore {
  robustPriority: number;
  stressSuccesses: number;
  priorityWeightedArrival: number;
  worstReserveMargin: number;
  travelKm: number;
}

function priorityWeight(priority: Priority) {
  return priority === "critical" ? 5 : priority === "high" ? 2 : 1;
}

function betterCandidate(next: CandidateScore, current: CandidateScore | null) {
  if (!current) return true;
  if (next.robustPriority !== current.robustPriority) return next.robustPriority > current.robustPriority;
  if (next.stressSuccesses !== current.stressSuccesses) return next.stressSuccesses > current.stressSuccesses;
  if (next.priorityWeightedArrival !== current.priorityWeightedArrival) return next.priorityWeightedArrival < current.priorityWeightedArrival;
  if (next.worstReserveMargin !== current.worstReserveMargin) return next.worstReserveMargin > current.worstReserveMargin;
  return next.travelKm < current.travelKm;
}

export function buildVerifiedPlan(
  blockedRoutes: string[] = [],
  needs: PowerNeed[] = DEFAULT_NEEDS,
  context: PlanningContext = {},
): DispatchPlan {
  const scenarios = buildStressScenarios();
  const availableVehicles = getAvailableVehicles(context);
  let candidatePlans = 0;
  let robustFeasiblePlans = 0;
  let winningAssignments: Assignment[] | null = null;
  let winningStress: StressResult | null = null;
  let winningScore: CandidateScore | null = null;

  const search = (needIndex: number, usedVehicleIds: Set<string>, assignments: Assignment[]) => {
    if (needIndex === needs.length) {
      candidatePlans += 1;
      const adversarial = assignments.map((assignment) => (
        evaluateAssignment(assignment.vehicle, assignment.need, blockedRoutes, ADVERSARIAL_CORNER, context)
      ));
      const robustPriority = adversarial.reduce((total, assignment) => (
        total + (assignment.safe ? priorityWeight(assignment.need.priority) : 0)
      ), 0);
      const fullyRobust = adversarial.every((assignment) => assignment.safe);
      if (fullyRobust) robustFeasiblePlans += 1;

      const stress = assessFixedAssignments(assignments, needs, blockedRoutes, scenarios, context);
      const score: CandidateScore = {
        robustPriority,
        stressSuccesses: stress.successfulScenarios,
        priorityWeightedArrival: assignments.reduce((total, assignment) => (
          total + assignment.route.oneWayMinutes * priorityWeight(assignment.need.priority)
        ), 0),
        worstReserveMargin: Math.min(...adversarial.map((assignment) => assignment.reserveMargin)),
        travelKm: assignments.reduce((total, assignment) => total + assignment.route.roundTripKm, 0),
      };

      if (betterCandidate(score, winningScore)) {
        winningScore = score;
        winningAssignments = assignments;
        winningStress = stress;
      }
      return;
    }

    const need = needs[needIndex];
    for (const vehicle of availableVehicles) {
      if (usedVehicleIds.has(vehicle.id)) continue;
      usedVehicleIds.add(vehicle.id);
      search(
        needIndex + 1,
        usedVehicleIds,
        [...assignments, evaluateAssignment(vehicle, need, blockedRoutes, NOMINAL, context)],
      );
      usedVehicleIds.delete(vehicle.id);
    }
  };

  search(0, new Set(), []);
  if (!winningAssignments || !winningStress) throw new Error("No synthetic allocation candidates were generated");

  const selectedAssignments = winningAssignments as Assignment[];
  const selectedStress = winningStress as StressResult;
  selectedAssignments.sort((a, b) => needs.findIndex((need) => need.id === a.need.id) - needs.findIndex((need) => need.id === b.need.id));
  const plan = summarize(selectedAssignments, blockedRoutes, needs);
  const baseline = buildGreedyBaseline(blockedRoutes, needs, context);

  plan.optimization = {
    algorithm: "Exact lexicographic search + Halton stress test",
    objective: [
      "Protect priority-weighted service",
      "Maximize scenario success",
      "Minimize priority-weighted arrival",
      "Maximize worst reserve margin",
    ],
    candidatePlans,
    robustFeasiblePlans,
    scenarioEvaluations: candidatePlans * scenarios.length,
    scenarioCount: scenarios.length,
    optimalityCertified: true,
    adversarialBounds: {
      demand: "±10%",
      soc: "±5 points",
      travel: "±20%",
    },
    baseline: assessFixedAssignments(baseline.assignments, needs, blockedRoutes, scenarios, context),
    optimized: selectedStress,
  };

  return plan;
}

interface DecisionProbe {
  id: string;
  needId: PowerNeed["id"];
  field: DecisionQuestion["field"];
  fieldLabel: string;
  adverseValue: number;
  question: string;
  assumption: string;
  confirmedLabel: string;
  adverseLabel: string;
  confirmedDetail: string;
  adverseDetail: string;
}

const DECISION_PROBES: DecisionProbe[] = [
  {
    id: "water-startup-surge",
    needId: "water",
    field: "peakPowerKw",
    fieldLabel: "start-up peak",
    adverseValue: 6.5,
    question: "Can East Water Station absorb the pump start-up surge locally?",
    assumption: "Pump start-up surge is handled on site",
    confirmedLabel: "Yes · surge capped locally",
    adverseLabel: "No · vehicle sees 6.5 kW peak",
    confirmedDetail: "Continuous demand and peak both remain at 4.2 kW",
    adverseDetail: "Energy stays 4.2 kW average, but the inverter must survive a 6.5 kW start",
  },
  {
    id: "shelter-heating-load",
    needId: "shelter",
    field: "powerKw",
    fieldLabel: "continuous load",
    adverseValue: 3.2,
    question: "Will North Shelter add space-heating load during the six-hour mission?",
    assumption: "No space-heating load is included",
    confirmedLabel: "No · lights and comms only",
    adverseLabel: "Yes · demand rises to 3.2 kW",
    confirmedDetail: "The reported 2.4 kW envelope remains valid",
    adverseDetail: "A synthetic warming load raises continuous demand by 0.8 kW",
  },
  {
    id: "clinic-cold-chain-window",
    needId: "clinic",
    field: "durationHours",
    fieldLabel: "service duration",
    adverseValue: 10,
    question: "Is eight hours sufficient to bridge the clinic cold-chain outage?",
    assumption: "Load remains stable for the stated window",
    confirmedLabel: "Yes · eight-hour bridge",
    adverseLabel: "No · extend service to ten hours",
    confirmedDetail: "The source-linked eight-hour window is confirmed",
    adverseDetail: "The synthetic restoration estimate slips by two hours",
  },
];

function valueForField(need: PowerNeed, field: DecisionQuestion["field"]): number {
  if (field === "peakPowerKw") return need.peakPowerKw ?? need.powerKw;
  return need[field];
}

function patchNeed(
  needs: PowerNeed[],
  needId: PowerNeed["id"],
  field: DecisionQuestion["field"],
  value: number,
): PowerNeed[] {
  return needs.map((need) => need.id === needId ? { ...need, [field]: value } : { ...need });
}

function assignmentRecord(plan: DispatchPlan): Record<PowerNeed["id"], string> {
  return Object.fromEntries(
    plan.assignments.map((assignment) => [assignment.need.id, assignment.vehicle.id]),
  ) as Record<PowerNeed["id"], string>;
}

function changedAssignments(
  first: Record<PowerNeed["id"], string>,
  second: Record<PowerNeed["id"], string>,
) {
  return (Object.keys(first) as PowerNeed["id"][])
    .filter((needId) => first[needId] !== second[needId])
    .length;
}

function assessPlanAgainstNeeds(
  plan: DispatchPlan,
  needs: PowerNeed[],
  blockedRoutes: string[],
  scenarios: ScenarioVariation[],
) {
  const rebound = needs.map((need) => {
    const assignment = plan.assignments.find((candidate) => candidate.need.id === need.id);
    if (!assignment) throw new Error(`Missing assignment for ${need.id}`);
    return evaluateAssignment(assignment.vehicle, need, blockedRoutes);
  });
  return assessFixedAssignments(rebound, needs, blockedRoutes, scenarios);
}

export function buildDecisionAnalysis(
  needs: PowerNeed[] = DEFAULT_NEEDS,
  blockedRoutes: string[] = [],
): DecisionAnalysis {
  const scenarios = buildStressScenarios();
  const unresolvedPlan = buildVerifiedPlan(blockedRoutes, needs);
  let counterfactualPlanScenarioEvaluations = 0;

  const questions = DECISION_PROBES.map((probe) => {
    const need = needs.find((candidate) => candidate.id === probe.needId);
    if (!need) throw new Error(`Missing need for decision probe ${probe.id}`);
    const confirmedValue = valueForField(need, probe.field);
    const variants: Array<{
      id: DecisionAnswerId;
      label: string;
      detail: string;
      value: number;
    }> = [
      {
        id: "confirmed",
        label: probe.confirmedLabel,
        detail: probe.confirmedDetail,
        value: confirmedValue,
      },
      {
        id: "adverse",
        label: probe.adverseLabel,
        detail: probe.adverseDetail,
        value: probe.adverseValue,
      },
    ];

    const options = variants.map((variant) => {
      const adjustedNeeds = patchNeed(needs, probe.needId, probe.field, variant.value);
      const informedPlan = buildVerifiedPlan(blockedRoutes, adjustedNeeds);
      const informedStress = informedPlan.optimization!.optimized;
      const unresolvedStress = assessPlanAgainstNeeds(unresolvedPlan, adjustedNeeds, blockedRoutes, scenarios);
      counterfactualPlanScenarioEvaluations += informedPlan.optimization!.scenarioEvaluations + scenarios.length;
      return {
        id: variant.id,
        label: variant.label,
        detail: variant.detail,
        adjustedValue: variant.value,
        assignments: assignmentRecord(informedPlan),
        successRate: informedStress.successRate,
        violationScenarios: informedStress.violationScenarios,
        unresolvedPlanViolationScenarios: unresolvedStress.violationScenarios,
        avoidedViolationScenarios: Math.max(
          0,
          unresolvedStress.violationScenarios - informedStress.violationScenarios,
        ),
      } satisfies DecisionQuestionOption;
    }) as [DecisionQuestionOption, DecisionQuestionOption];

    const assignmentChanges = changedAssignments(options[0].assignments, options[1].assignments);
    const avoidableViolationScenarios = Math.max(...options.map((option) => option.avoidedViolationScenarios));
    const expectedAvoidedViolationScenarios = round(
      options.reduce((total, option) => total + option.avoidedViolationScenarios, 0) / options.length,
      1,
    );
    const score = (
      avoidableViolationScenarios * priorityWeight(need.priority)
      + assignmentChanges * scenarios.length
      + Math.round((1 - need.confidence) * 100)
    );

    return {
      id: probe.id,
      needId: probe.needId,
      facility: need.facility,
      question: probe.question,
      assumption: probe.assumption,
      field: probe.field,
      fieldLabel: probe.fieldLabel,
      priority: need.priority,
      rank: 0,
      score,
      assignmentChanges,
      avoidableViolationScenarios,
      expectedAvoidedViolationScenarios,
      options,
    } satisfies DecisionQuestion;
  })
    .sort((first, second) => second.score - first.score || first.id.localeCompare(second.id))
    .map((question, index) => ({ ...question, rank: index + 1 }));

  return {
    algorithm: "Exact counterfactual value-of-information ranking",
    questionCount: questions.length,
    counterfactualPlanScenarioEvaluations,
    topQuestion: questions[0],
    questions,
  };
}

export function applyDecisionAnswer(
  needs: PowerNeed[],
  question: DecisionQuestion,
  answerId: DecisionAnswerId,
): PowerNeed[] {
  const option = question.options.find((candidate) => candidate.id === answerId);
  if (!option) throw new Error(`Unknown decision answer ${answerId}`);
  return patchNeed(needs, question.needId, question.field, option.adjustedValue).map((need) => (
    need.id === question.needId
      ? {
          ...need,
          confidence: 1,
          assumptions: [
            ...need.assumptions.filter((assumption) => assumption !== question.assumption),
            `Operator verified: ${option.label}`,
          ],
        }
      : need
  ));
}

interface ContingencySpec {
  id: string;
  kind: ContingencyKind;
  label: string;
  detail: string;
  unavailableVehicleId?: string;
  blockedRouteId?: string;
}

interface PreparednessAction {
  id: string;
  label: string;
  detail: string;
  reserveVehicleId?: string;
  actionCost: number;
  actionCostLabel: string;
  context: PlanningContext;
}

const CONTINGENCY_CASES: ContingencySpec[] = [
  ...VEHICLES.map((vehicle) => ({
    id: `vehicle-${vehicle.id}`,
    kind: "vehicle-loss" as const,
    label: `${vehicle.id} unavailable`,
    detail: `The ${vehicle.id} battery leaves the response pool before service begins`,
    unavailableVehicleId: vehicle.id,
  })),
  { id: "route-river-road", kind: "route-closure", label: "River Road closed", detail: "The primary clinic corridor is unavailable", blockedRouteId: "river-road" },
  { id: "route-clinic-cut", kind: "route-closure", label: "Clinic Cut closed", detail: "The short local clinic approach is unavailable", blockedRouteId: "clinic-cut" },
  { id: "route-north-link", kind: "route-closure", label: "North Link closed", detail: "The primary shelter corridor is unavailable", blockedRouteId: "north-link" },
  { id: "route-east-bridge", kind: "route-closure", label: "East Bridge closed", detail: "The primary water-station corridor is unavailable", blockedRouteId: "east-bridge" },
  { id: "route-ridge-bypass", kind: "route-closure", label: "Ridge Bypass closed", detail: "The eastern alternate corridor is unavailable", blockedRouteId: "ridge-bypass" },
  { id: "route-west-relay", kind: "route-closure", label: "West Relay closed", detail: "The proposed reserve staging corridor is unavailable", blockedRouteId: "west-relay" },
  { id: "route-charge-link", kind: "route-closure", label: "Charge Link closed", detail: "The proposed pre-charge access corridor is unavailable", blockedRouteId: "charge-link" },
];

const PREPAREDNESS_ACTIONS: PreparednessAction[] = [
  {
    id: "none",
    label: "No preventive action",
    detail: "Keep the nominal robust allocation and react only after a failure",
    actionCost: 0,
    actionCostLabel: "0 burden points",
    context: {},
  },
  {
    id: "stage-e32-west-relay",
    label: "Stage E-32 at West Relay",
    detail: "Hold idle E-32 as a clinic-capable reserve on an independent corridor",
    reserveVehicleId: "E-32",
    actionCost: 8,
    actionCostLabel: "8 burden points · 8 km staging",
    context: {
      vehicleOverrides: {
        "E-32": { soc: 62 },
      },
      routeOverrides: {
        "E-32/clinic": { routeId: "west-relay", routeLabel: "West Relay", roundTripKm: 18, oneWayMinutes: 30 },
        "E-32/shelter": { routeId: "north-link", routeLabel: "North Link via West Relay", roundTripKm: 26, oneWayMinutes: 38 },
        "E-32/water": { routeId: "east-bridge", routeLabel: "East Bridge via West Relay", roundTripKm: 42, oneWayMinutes: 62 },
      },
    },
  },
  {
    id: "precharge-e12",
    label: "Pre-charge E-12 at Charge Link",
    detail: "Raise E-12 from 46% to 70% so it can become a clinic reserve",
    reserveVehicleId: "E-12",
    actionCost: 11,
    actionCostLabel: "11 burden points · +10.6 kWh",
    context: {
      vehicleOverrides: {
        "E-12": { soc: 70 },
      },
      routeOverrides: {
        "E-12/clinic": { routeId: "charge-link", routeLabel: "Charge Link", roundTripKm: 17, oneWayMinutes: 22 },
      },
    },
  },
];

function evaluatePreparednessAction(
  action: PreparednessAction,
  primaryPlan: DispatchPlan,
  needs: PowerNeed[],
  baseBlockedRoutes: string[],
): PreparednessActionResult {
  const primaryAssignments = assignmentRecord(primaryPlan);
  const cases = CONTINGENCY_CASES.map((contingency) => {
    const blockedRoutes = contingency.blockedRouteId
      ? [...new Set([...baseBlockedRoutes, contingency.blockedRouteId])]
      : baseBlockedRoutes;
    const context: PlanningContext = {
      ...action.context,
      unavailableVehicleIds: contingency.unavailableVehicleId
        ? [...new Set([...(action.context.unavailableVehicleIds ?? []), contingency.unavailableVehicleId])]
        : action.context.unavailableVehicleIds,
    };
    const recoveryPlan = buildVerifiedPlan(blockedRoutes, needs, context);
    const stress = recoveryPlan.optimization!.optimized;
    const recoveryAssignments = assignmentRecord(recoveryPlan);
    const criticalServiceProtected = stress.criticalSuccessRate === 100;

    return {
      id: contingency.id,
      kind: contingency.kind,
      label: contingency.label,
      detail: contingency.detail,
      criticalServiceProtected,
      criticalSuccessRate: stress.criticalSuccessRate,
      fullMissionSuccessRate: stress.successRate,
      criticalViolationScenarios: stress.criticalViolationScenarios,
      unservedCriticalKwh: recoveryPlan.unservedCriticalKwh,
      missionChanges: changedAssignments(primaryAssignments, recoveryAssignments),
      assignments: recoveryAssignments,
      candidatePlans: recoveryPlan.optimization!.candidatePlans,
      planScenarioEvaluations: recoveryPlan.optimization!.scenarioEvaluations,
    } satisfies ContingencyCase;
  });
  const protectedContingencies = cases.filter((contingency) => contingency.criticalServiceProtected).length;
  const planScenarioEvaluations = cases.reduce((total, contingency) => total + contingency.planScenarioEvaluations, 0);

  return {
    id: action.id,
    label: action.label,
    detail: action.detail,
    reserveVehicleId: action.reserveVehicleId,
    actionCost: action.actionCost,
    actionCostLabel: action.actionCostLabel,
    protectedContingencies,
    protectionRate: round((protectedContingencies / cases.length) * 100, 1),
    worstCriticalSuccessRate: Math.min(...cases.map((contingency) => contingency.criticalSuccessRate)),
    nMinusOneCertified: protectedContingencies === cases.length,
    planScenarioEvaluations,
    cases,
  };
}

function betterPreparednessAction(
  next: PreparednessActionResult,
  current: PreparednessActionResult,
) {
  if (next.protectedContingencies !== current.protectedContingencies) {
    return next.protectedContingencies > current.protectedContingencies;
  }
  if (next.worstCriticalSuccessRate !== current.worstCriticalSuccessRate) {
    return next.worstCriticalSuccessRate > current.worstCriticalSuccessRate;
  }
  if (next.actionCost !== current.actionCost) return next.actionCost < current.actionCost;
  return next.id.localeCompare(current.id) < 0;
}

export function buildResilienceAnalysis(
  needs: PowerNeed[] = DEFAULT_NEEDS,
  baseBlockedRoutes: string[] = [],
): ResilienceAnalysis {
  const primaryPlan = buildVerifiedPlan(baseBlockedRoutes, needs);
  const candidateActions = PREPAREDNESS_ACTIONS.map((action) => (
    evaluatePreparednessAction(action, primaryPlan, needs, baseBlockedRoutes)
  ));
  const baseline = candidateActions.find((action) => action.id === "none")!;
  const selectedAction = candidateActions.reduce((best, action) => (
    betterPreparednessAction(action, best) ? action : best
  ));

  return {
    algorithm: "Exact N-1 contingency search + minimum-intervention selection",
    contingencyCount: CONTINGENCY_CASES.length,
    actionCount: PREPAREDNESS_ACTIONS.length,
    totalPlanScenarioEvaluations: candidateActions.reduce(
      (total, action) => total + action.planScenarioEvaluations,
      0,
    ),
    baseline,
    selectedAction,
    candidateActions,
    eliminatedSinglePoints: Math.max(0, selectedAction.protectedContingencies - baseline.protectedContingencies),
    weakestBaselineCases: baseline.cases.filter((contingency) => !contingency.criticalServiceProtected),
  };
}

export function getIdleVehicles(plan: DispatchPlan): Vehicle[] {
  const assigned = new Set(plan.assignments.map((assignment) => assignment.vehicle.id));
  return VEHICLES.filter((vehicle) => !assigned.has(vehicle.id));
}
