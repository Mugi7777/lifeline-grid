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
  checks: SafetyCheck[];
  safe: boolean;
}

export interface DispatchPlan {
  assignments: Assignment[];
  blockedRoutes: string[];
  violationCount: number;
  unservedCriticalKwh: number;
  criticalSiteHours: number;
  allNeedsServed: boolean;
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

const round = (value: number, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

function getRoute(vehicleId: string, needId: PowerNeed["id"]): RouteOption {
  const route = ROUTES.find((candidate) => candidate.vehicleId === vehicleId && candidate.needId === needId);
  if (!route) throw new Error(`Missing synthetic route ${vehicleId}/${needId}`);
  return route;
}

export function evaluateAssignment(
  vehicle: Vehicle,
  need: PowerNeed,
  blockedRoutes: string[] = [],
): Assignment {
  const route = getRoute(vehicle.id, need.id);
  const demandKwh = need.powerKw * need.durationHours;
  const travelEnergy = route.roundTripKm * vehicle.travelKwhPerKm;
  const usableKwh = Math.max(
    0,
    vehicle.capacityKwh * ((vehicle.soc - vehicle.reserveSoc) / 100) * vehicle.efficiency - travelEnergy,
  );
  const coverageHours = Math.min(need.durationHours, usableKwh / need.powerKw);
  const postMissionSoc = vehicle.soc - (
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
      detail: `${vehicle.maxPowerKw.toFixed(1)} kW available / ${need.powerKw.toFixed(1)} kW required`,
      pass: vehicle.maxPowerKw >= need.powerKw,
    },
    {
      code: "deadline",
      label: "Arrival deadline",
      detail: `${route.oneWayMinutes} min travel / ${need.deadlineMinutes} min limit`,
      pass: route.oneWayMinutes <= need.deadlineMinutes,
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
    checks,
    safe: checks.every((check) => check.pass),
  };
}

function summarize(assignments: Assignment[], blockedRoutes: string[], needs: PowerNeed[]): DispatchPlan {
  const criticalNeeds = needs.filter((need) => need.priority === "critical");
  const criticalSiteHours = criticalNeeds.reduce((total, need) => {
    const assignment = assignments.find((item) => item.need.id === need.id);
    return total + (assignment?.coverageHours ?? 0);
  }, 0);
  const unservedCriticalKwh = criticalNeeds.reduce((total, need) => {
    const assignment = assignments.find((item) => item.need.id === need.id);
    const delivered = assignment ? Math.min(assignment.usableKwh, assignment.demandKwh) : 0;
    return total + Math.max(0, need.powerKw * need.durationHours - delivered);
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

export function buildVerifiedPlan(
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
    const candidates = VEHICLES
      .filter((vehicle) => !usedVehicles.has(vehicle.id))
      .map((vehicle) => evaluateAssignment(vehicle, need, blockedRoutes))
      .filter((assignment) => assignment.safe)
      .sort((a, b) => (
        a.route.oneWayMinutes - b.route.oneWayMinutes
        || b.postMissionSoc - a.postMissionSoc
        || a.vehicle.id.localeCompare(b.vehicle.id)
      ));
    const selected = candidates[0];
    if (selected) {
      assignments.push(selected);
      usedVehicles.add(selected.vehicle.id);
    }
  }

  assignments.sort((a, b) => DEFAULT_NEEDS.findIndex((need) => need.id === a.need.id) - DEFAULT_NEEDS.findIndex((need) => need.id === b.need.id));
  return summarize(assignments, blockedRoutes, needs);
}

export function getIdleVehicles(plan: DispatchPlan): Vehicle[] {
  const assigned = new Set(plan.assignments.map((assignment) => assignment.vehicle.id));
  return VEHICLES.filter((vehicle) => !assigned.has(vehicle.id));
}
