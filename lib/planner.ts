export type Connector = "V2L" | "V2H" | "V2B";
export type Priority = "critical" | "high" | "standard";

export interface PowerNeed {
  id: "clinic" | "shelter" | "water";
  facility: string;
  summary: string;
  report: string;
  sourceQuote: string;
  powerKw: number;
  durationHours: number;
  deadlineMinutes: number;
  priority: Priority;
  connector: Connector;
  confidence: number;
  assumptions: string[];
  x: number;
  y: number;
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

function getRoute(vehicleId: string, needId: PowerNeed["id"]): RouteOption {
  const route = ROUTES.find((candidate) => candidate.vehicleId === vehicleId && candidate.needId === needId);
  if (!route) throw new Error(`Missing synthetic route ${vehicleId}/${needId}`);
  return route;
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
): Assignment {
  const route = getRoute(vehicle.id, need.id);
  const startingSoc = Math.max(0, Math.min(100, vehicle.soc + variation.socDelta));
  const requiredPowerKw = need.powerKw * variation.demandScale;
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
      detail: `${vehicle.maxPowerKw.toFixed(1)} kW available / ${round(requiredPowerKw)} kW required`,
      pass: vehicle.maxPowerKw + 0.001 >= requiredPowerKw,
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
): StressResult {
  let successfulScenarios = 0;
  let totalUnserved = 0;
  let worstUnserved = 0;
  let totalCriticalUnserved = 0;
  let worstCriticalUnserved = 0;
  let worstReserveMargin = Number.POSITIVE_INFINITY;

  for (const scenario of scenarios) {
    const evaluated = assignments.map((assignment) => (
      evaluateAssignment(assignment.vehicle, assignment.need, blockedRoutes, scenario)
    ));
    const byNeed = new Map(evaluated.map((assignment) => [assignment.need.id, assignment]));
    const success = needs.every((need) => byNeed.get(need.id)?.safe === true);
    if (success) successfulScenarios += 1;

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
): DispatchPlan {
  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, standard: 2 };
  const orderedNeeds = [...needs].sort((a, b) => {
    const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
    return priorityDelta || a.deadlineMinutes - b.deadlineMinutes;
  });
  const usedVehicles = new Set<string>();
  const assignments: Assignment[] = [];

  for (const need of orderedNeeds) {
    const selected = VEHICLES
      .filter((vehicle) => !usedVehicles.has(vehicle.id))
      .map((vehicle) => evaluateAssignment(vehicle, need, blockedRoutes))
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
): DispatchPlan {
  const scenarios = buildStressScenarios();
  let candidatePlans = 0;
  let robustFeasiblePlans = 0;
  let winningAssignments: Assignment[] | null = null;
  let winningStress: StressResult | null = null;
  let winningScore: CandidateScore | null = null;

  const search = (needIndex: number, usedVehicleIds: Set<string>, assignments: Assignment[]) => {
    if (needIndex === needs.length) {
      candidatePlans += 1;
      const adversarial = assignments.map((assignment) => (
        evaluateAssignment(assignment.vehicle, assignment.need, blockedRoutes, ADVERSARIAL_CORNER)
      ));
      const robustPriority = adversarial.reduce((total, assignment) => (
        total + (assignment.safe ? priorityWeight(assignment.need.priority) : 0)
      ), 0);
      const fullyRobust = adversarial.every((assignment) => assignment.safe);
      if (fullyRobust) robustFeasiblePlans += 1;

      const stress = assessFixedAssignments(assignments, needs, blockedRoutes, scenarios);
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
    for (const vehicle of VEHICLES) {
      if (usedVehicleIds.has(vehicle.id)) continue;
      usedVehicleIds.add(vehicle.id);
      search(
        needIndex + 1,
        usedVehicleIds,
        [...assignments, evaluateAssignment(vehicle, need, blockedRoutes)],
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
  const baseline = buildGreedyBaseline(blockedRoutes, needs);

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
    baseline: assessFixedAssignments(baseline.assignments, needs, blockedRoutes, scenarios),
    optimized: selectedStress,
  };

  return plan;
}

export function getIdleVehicles(plan: DispatchPlan): Vehicle[] {
  const assigned = new Set(plan.assignments.map((assignment) => assignment.vehicle.id));
  return VEHICLES.filter((vehicle) => !assigned.has(vehicle.id));
}
