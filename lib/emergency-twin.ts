import { canonicalize, sha256Hex } from "./operations.ts";
import {
  DEFAULT_NEEDS,
  VEHICLES,
  type Assignment,
  type DispatchPlan,
  type PowerNeed,
  type Vehicle,
} from "./planner.ts";

export const EMERGENCY_TWIN_SCHEMA_VERSION = "2026-07-21.1" as const;
export const EMERGENCY_TWIN_MAX_MINUTE = 90;
export const EMERGENCY_TWIN_STEP_MINUTES = 5;

export type TwinScenario = "nominal" | "pump_drift" | "bridge_conflict" | "telemetry_loss";
export type TwinLayer = "observed" | "estimated" | "forecast";
export type TwinFreshness = "fresh" | "stale";
export type Coordinate = [number, number];

export const EMERGENCY_FACILITY_COORDINATES: Record<PowerNeed["id"], Coordinate> = {
  clinic: [33.5655, 133.5322],
  shelter: [33.5788, 133.5214],
  water: [33.5527, 133.5687],
};

export const EMERGENCY_VEHICLE_COORDINATES: Record<string, Coordinate> = {
  "E-07": [33.5579, 133.5211],
  "E-12": [33.5681, 133.5452],
  "E-21": [33.5572, 133.5502],
  "E-32": [33.5803, 133.5541],
  "E-44": [33.5467, 133.5445],
};

export const TWIN_SCENARIOS: Record<TwinScenario, { label: string; summary: string }> = {
  nominal: {
    label: "Nominal feed",
    summary: "All eight synthetic sources remain fresh and track the verified reference plan.",
  },
  pump_drift: {
    label: "Pump drift",
    summary: "The water-station load rises toward 6.5 kW and challenges the assigned asset's output limit.",
  },
  bridge_conflict: {
    label: "Bridge conflict",
    summary: "Two synthetic road reports disagree. The route is flagged, but the active plan is not changed.",
  },
  telemetry_loss: {
    label: "Telemetry loss",
    summary: "Two sources stop reporting. Observed state freezes while the estimator carries uncertainty forward.",
  },
};

export interface KalmanEstimate {
  estimate: number;
  variance: number;
  gain: number;
}

export interface TwinAssetState {
  id: string;
  mission: PowerNeed["id"] | null;
  phase: "idle" | "enroute" | "serving" | "returning" | "complete";
  plannedSoc: number;
  observedSoc: number | null;
  lastObservedSoc: number;
  estimatedSoc: number;
  forecastSoc: number;
  uncertaintySocPoints: number;
  dataAgeMinutes: number;
  freshness: TwinFreshness;
  observedCoordinate: Coordinate;
  estimatedCoordinate: Coordinate;
  forecastCoordinate: Coordinate;
  reserveSoc: number;
}

export interface TwinFacilityState {
  id: PowerNeed["id"];
  facility: string;
  priority: PowerNeed["priority"];
  contractLoadKw: number;
  observedLoadKw: number | null;
  lastObservedLoadKw: number;
  estimatedLoadKw: number;
  forecastLoadKw: number;
  uncertaintyKw: number;
  dataAgeMinutes: number;
  freshness: TwinFreshness;
  assignedVehicleId: string | null;
  supplyPhase: "awaiting" | "energized" | "gap";
}

export interface TwinRoadState {
  routeId: "east-bridge";
  state: "open" | "conflicting";
  confidence: number;
  planningEffect: "not_applied";
  evidenceRequired: boolean;
}

export interface TwinEvent {
  id: string;
  minute: number;
  severity: "info" | "watch" | "critical";
  source: string;
  title: string;
  detail: string;
  evidenceStatus: "synthetic-verified" | "unverified" | "stale";
}

export interface EmergencyTwinSnapshot {
  schemaVersion: typeof EMERGENCY_TWIN_SCHEMA_VERSION;
  simulationMinute: number;
  scenario: TwinScenario;
  scenarioLabel: string;
  mode: "synthetic-tabletop";
  algorithm: "Event-sourced replay + scalar Kalman filter + deterministic 6h forecast";
  sourceCoveragePct: number;
  twinLagSeconds: number;
  trustState: "synchronized" | "degraded";
  planDivergenceScore: number;
  projectedCriticalGapKwh: number;
  projectedReserveBreaches: number;
  forecastHorizonHours: 6;
  assets: TwinAssetState[];
  facilities: TwinFacilityState[];
  roads: TwinRoadState[];
  events: TwinEvent[];
  gates: {
    telemetryAuthority: "synthetic_only";
    worldAutoApplication: "prohibited";
    dispatch: "human_dual_control_required";
    fieldOperation: "blocked";
  };
}

const round = (value: number, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function interpolate(start: Coordinate, destination: Coordinate, progress: number): Coordinate {
  const bounded = clamp(progress, 0, 1);
  return [
    round(start[0] + (destination[0] - start[0]) * bounded, 6),
    round(start[1] + (destination[1] - start[1]) * bounded, 6),
  ];
}

function stableSignal(seed: string, minute: number, amplitude: number) {
  const seedValue = [...seed].reduce((sum, character, index) => sum + character.charCodeAt(0) * (index + 1), 0);
  return Math.sin((minute + seedValue % 31) * 0.37) * amplitude
    + Math.cos((minute + seedValue % 17) * 0.19) * amplitude * 0.35;
}

/** A deterministic scalar Kalman filter. The caller owns the process and sensor-noise contract. */
export function scalarKalmanFilter(
  measurements: number[],
  initialEstimate: number,
  initialVariance = 1,
  processNoise = 0.08,
  measurementNoise = 0.42,
): KalmanEstimate {
  let estimate = initialEstimate;
  let variance = initialVariance;
  let gain = 0;
  for (const measurement of measurements) {
    variance += processNoise;
    gain = variance / (variance + measurementNoise);
    estimate += gain * (measurement - estimate);
    variance *= 1 - gain;
  }
  return { estimate, variance, gain };
}

function assignmentForVehicle(plan: DispatchPlan, vehicleId: string) {
  return plan.assignments.find((assignment) => assignment.vehicle.id === vehicleId) ?? null;
}

function assignmentForNeed(plan: DispatchPlan, needId: PowerNeed["id"]) {
  return plan.assignments.find((assignment) => assignment.need.id === needId) ?? null;
}

function outboundTravelSocPoints(assignment: Assignment) {
  const outboundKwh = assignment.route.roundTripKm * assignment.vehicle.travelKwhPerKm / 2;
  return outboundKwh / assignment.vehicle.capacityKwh * 100;
}

function plannedVehicleSoc(vehicle: Vehicle, assignment: Assignment | null, minute: number) {
  if (!assignment) return vehicle.soc;
  const travelMinutes = Math.max(1, assignment.effectiveOneWayMinutes);
  const outboundSoc = outboundTravelSocPoints(assignment);
  if (minute <= travelMinutes) return vehicle.soc - outboundSoc * minute / travelMinutes;
  const serviceMinutes = assignment.need.durationHours * 60;
  const serviceProgress = clamp((minute - travelMinutes) / serviceMinutes, 0, 1);
  const serviceSoc = assignment.demandKwh / assignment.vehicle.efficiency / assignment.vehicle.capacityKwh * 100;
  const serviceEnd = travelMinutes + serviceMinutes;
  const returnProgress = clamp((minute - serviceEnd) / travelMinutes, 0, 1);
  return vehicle.soc - outboundSoc - serviceSoc * serviceProgress - outboundSoc * returnProgress;
}

function vehicleTruthSoc(
  vehicle: Vehicle,
  assignment: Assignment | null,
  minute: number,
  scenario: TwinScenario,
) {
  let truth = plannedVehicleSoc(vehicle, assignment, minute);
  if (scenario === "pump_drift" && assignment?.need.id === "water" && minute > 30) {
    const serviceEnd = assignment.effectiveOneWayMinutes + assignment.need.durationHours * 60;
    const driftMinutes = Math.max(0, Math.min(minute, serviceEnd) - 30);
    const excessKwh = 2.3 * driftMinutes / 60;
    truth -= excessKwh / vehicle.efficiency / vehicle.capacityKwh * 100;
  }
  return clamp(truth, 0, 100);
}

function vehicleMeasurement(vehicle: Vehicle, assignment: Assignment | null, minute: number, scenario: TwinScenario) {
  return clamp(vehicleTruthSoc(vehicle, assignment, minute, scenario) + stableSignal(vehicle.id, minute, 0.28), 0, 100);
}

function facilityTruthLoad(need: PowerNeed, minute: number, scenario: TwinScenario) {
  if (scenario !== "pump_drift" || need.id !== "water" || minute <= 25) return need.powerKw;
  return need.powerKw + 2.3 * clamp((minute - 25) / 20, 0, 1);
}

function facilityMeasurement(need: PowerNeed, minute: number, scenario: TwinScenario) {
  return Math.max(0, facilityTruthLoad(need, minute, scenario) + stableSignal(need.id, minute, 0.055));
}

function observationCutoff(kind: "asset" | "facility", id: string, scenario: TwinScenario, currentMinute: number) {
  if (scenario !== "telemetry_loss") return currentMinute;
  if (kind === "asset" && id === "E-44") return Math.min(currentMinute, 30);
  if (kind === "facility" && id === "water") return Math.min(currentMinute, 35);
  return currentMinute;
}

function sampleMinutes(cutoff: number) {
  const samples: number[] = [];
  for (let minute = 0; minute <= cutoff; minute += EMERGENCY_TWIN_STEP_MINUTES) samples.push(minute);
  return samples;
}

function vehiclePhase(assignment: Assignment | null, minute: number): TwinAssetState["phase"] {
  if (!assignment) return "idle";
  const arrival = assignment.effectiveOneWayMinutes;
  const serviceEnd = arrival + assignment.need.durationHours * 60;
  const missionEnd = serviceEnd + arrival;
  if (minute < arrival) return "enroute";
  if (minute < serviceEnd) return "serving";
  if (minute < missionEnd) return "returning";
  return "complete";
}

function vehicleCoordinate(assignment: Assignment | null, vehicleId: string, minute: number): Coordinate {
  const origin = EMERGENCY_VEHICLE_COORDINATES[vehicleId];
  if (!assignment) return origin;
  const destination = EMERGENCY_FACILITY_COORDINATES[assignment.need.id];
  const travelMinutes = Math.max(1, assignment.effectiveOneWayMinutes);
  const serviceEnd = travelMinutes + assignment.need.durationHours * 60;
  if (minute <= travelMinutes) return interpolate(origin, destination, minute / travelMinutes);
  if (minute <= serviceEnd) return destination;
  return interpolate(destination, origin, (minute - serviceEnd) / travelMinutes);
}

function buildAssetState(plan: DispatchPlan, vehicle: Vehicle, minute: number, scenario: TwinScenario): TwinAssetState {
  const assignment = assignmentForVehicle(plan, vehicle.id);
  const cutoff = observationCutoff("asset", vehicle.id, scenario, minute);
  const measurements = sampleMinutes(cutoff).map((sampleMinute) => vehicleMeasurement(vehicle, assignment, sampleMinute, scenario));
  const filtered = scalarKalmanFilter(measurements, vehicle.soc, 0.8, 0.035, 0.18);
  const dataAgeMinutes = minute - cutoff;
  const observedSoc = dataAgeMinutes > 10 ? null : measurements.at(-1) ?? vehicle.soc;
  const deadReckonedDelta = vehicleTruthSoc(vehicle, assignment, minute, scenario)
    - vehicleTruthSoc(vehicle, assignment, cutoff, scenario);
  const estimatedSoc = clamp(filtered.estimate + deadReckonedDelta, 0, 100);
  const forecastMinute = minute + 360;
  const forecastSoc = vehicleTruthSoc(vehicle, assignment, forecastMinute, scenario)
    + (estimatedSoc - vehicleTruthSoc(vehicle, assignment, minute, scenario));
  const observedCoordinate = vehicleCoordinate(assignment, vehicle.id, cutoff);
  return {
    id: vehicle.id,
    mission: assignment?.need.id ?? null,
    phase: vehiclePhase(assignment, minute),
    plannedSoc: round(plannedVehicleSoc(vehicle, assignment, minute), 1),
    observedSoc: observedSoc === null ? null : round(observedSoc, 1),
    lastObservedSoc: round(measurements.at(-1) ?? vehicle.soc, 1),
    estimatedSoc: round(estimatedSoc, 1),
    forecastSoc: round(clamp(forecastSoc, 0, 100), 1),
    uncertaintySocPoints: round(Math.sqrt(filtered.variance + dataAgeMinutes * 0.035), 2),
    dataAgeMinutes,
    freshness: dataAgeMinutes > 10 ? "stale" : "fresh",
    observedCoordinate,
    estimatedCoordinate: vehicleCoordinate(assignment, vehicle.id, minute),
    forecastCoordinate: vehicleCoordinate(assignment, vehicle.id, forecastMinute),
    reserveSoc: vehicle.reserveSoc,
  };
}

function buildFacilityState(plan: DispatchPlan, need: PowerNeed, minute: number, scenario: TwinScenario): TwinFacilityState {
  const assignment = assignmentForNeed(plan, need.id);
  const cutoff = observationCutoff("facility", need.id, scenario, minute);
  const measurements = sampleMinutes(cutoff).map((sampleMinute) => facilityMeasurement(need, sampleMinute, scenario));
  const filtered = scalarKalmanFilter(measurements, need.powerKw, 0.25, 0.025, 0.09);
  const dataAgeMinutes = minute - cutoff;
  const observedLoadKw = dataAgeMinutes > 10 ? null : measurements.at(-1) ?? need.powerKw;
  const trendProjection = scenario === "pump_drift" && need.id === "water" ? 6.5 : need.powerKw;
  const estimatedLoadKw = filtered.estimate
    + (facilityTruthLoad(need, minute, scenario) - facilityTruthLoad(need, cutoff, scenario));
  const supplyPhase = !assignment?.safe
    ? "gap"
    : minute >= assignment.effectiveOneWayMinutes
      ? "energized"
      : "awaiting";
  return {
    id: need.id,
    facility: need.facility,
    priority: need.priority,
    contractLoadKw: need.powerKw,
    observedLoadKw: observedLoadKw === null ? null : round(observedLoadKw, 2),
    lastObservedLoadKw: round(measurements.at(-1) ?? need.powerKw, 2),
    estimatedLoadKw: round(estimatedLoadKw, 2),
    forecastLoadKw: round(trendProjection, 2),
    uncertaintyKw: round(Math.sqrt(filtered.variance + dataAgeMinutes * 0.025), 2),
    dataAgeMinutes,
    freshness: dataAgeMinutes > 10 ? "stale" : "fresh",
    assignedVehicleId: assignment?.vehicle.id ?? null,
    supplyPhase,
  };
}

function buildEvents(plan: DispatchPlan, minute: number, scenario: TwinScenario): TwinEvent[] {
  const events: TwinEvent[] = [
    {
      id: "twin-start",
      minute: 0,
      severity: "info",
      source: "Twin kernel",
      title: "Synthetic replay initialized",
      detail: "Plan, facility demand and five modeled assets were bound to the event stream.",
      evidenceStatus: "synthetic-verified",
    },
    {
      id: "filter-lock",
      minute: 5,
      severity: "info",
      source: "State estimator",
      title: "Observed → Estimated → Forecast",
      detail: "Scalar Kalman filters converged without changing dispatch authority.",
      evidenceStatus: "synthetic-verified",
    },
  ];
  for (const assignment of plan.assignments) {
    events.push({
      id: `arrival-${assignment.vehicle.id}`,
      minute: assignment.effectiveOneWayMinutes,
      severity: assignment.safe ? "info" : "critical",
      source: assignment.vehicle.id,
      title: `${assignment.vehicle.id} reaches ${assignment.need.facility}`,
      detail: assignment.safe ? "The modeled service phase begins." : "The assignment retains a modeled constraint failure.",
      evidenceStatus: "synthetic-verified",
    });
  }
  if (scenario === "pump_drift") {
    events.push({
      id: "pump-drift",
      minute: 30,
      severity: "critical",
      source: "East Water meter",
      title: "Pump load departs from contract",
      detail: "Measured load is trending toward 6.5 kW; deterministic forecast exposes an output shortfall.",
      evidenceStatus: "synthetic-verified",
    });
  }
  if (scenario === "bridge_conflict") {
    events.push({
      id: "bridge-conflict",
      minute: 30,
      severity: "watch",
      source: "Road evidence gateway",
      title: "East Bridge reports conflict",
      detail: "The active plan remains unchanged. Authenticated evidence and human review are required.",
      evidenceStatus: "unverified",
    });
  }
  if (scenario === "telemetry_loss") {
    events.push({
      id: "telemetry-loss",
      minute: 35,
      severity: "watch",
      source: "Feed supervisor",
      title: "E-44 and water meter stop reporting",
      detail: "Observed values freeze; estimates are dead-reckoned with expanding uncertainty.",
      evidenceStatus: "stale",
    });
  }
  return events.filter((event) => event.minute <= minute).sort((left, right) => right.minute - left.minute || left.id.localeCompare(right.id));
}

function forecastCriticalGap(plan: DispatchPlan, facilities: TwinFacilityState[], assets: TwinAssetState[], minute: number) {
  let gap = 0;
  let reserveBreaches = 0;
  for (const facility of facilities.filter((item) => item.priority === "critical")) {
    const assignment = assignmentForNeed(plan, facility.id);
    if (!assignment?.safe) {
      gap += facility.forecastLoadKw * Math.min(6, assignment?.need.durationHours ?? 6);
      continue;
    }
    const serviceElapsedHours = Math.max(0, minute - assignment.effectiveOneWayMinutes) / 60;
    const remainingHours = Math.min(6, Math.max(0, assignment.need.durationHours - serviceElapsedHours));
    const asset = assets.find((item) => item.id === assignment.vehicle.id)!;
    const outputGap = Math.max(0, facility.forecastLoadKw - assignment.vehicle.maxPowerKw) * remainingHours;
    const availableKwh = Math.max(0, asset.estimatedSoc - assignment.vehicle.reserveSoc)
      / 100 * assignment.vehicle.capacityKwh * assignment.vehicle.efficiency;
    const returnTravelKwh = assignment.route.roundTripKm * assignment.vehicle.travelKwhPerKm / 2;
    const serviceEnd = assignment.effectiveOneWayMinutes + assignment.need.durationHours * 60;
    const returnProgress = clamp((minute - serviceEnd) / Math.max(1, assignment.effectiveOneWayMinutes), 0, 1);
    const remainingReturnKwh = returnTravelKwh * (1 - returnProgress);
    const energyGap = Math.max(0, facility.forecastLoadKw * remainingHours + remainingReturnKwh - availableKwh);
    gap += Math.max(outputGap, energyGap);
    if (asset.forecastSoc < asset.reserveSoc) reserveBreaches += 1;
  }
  return { gap: round(gap, 1), reserveBreaches };
}

export function buildEmergencyTwinSnapshot(
  plan: DispatchPlan,
  requestedMinute: number,
  scenario: TwinScenario = "nominal",
): EmergencyTwinSnapshot {
  const minute = clamp(Math.round(requestedMinute / EMERGENCY_TWIN_STEP_MINUTES) * EMERGENCY_TWIN_STEP_MINUTES, 0, EMERGENCY_TWIN_MAX_MINUTE);
  const assets = VEHICLES.map((vehicle) => buildAssetState(plan, vehicle, minute, scenario));
  const facilities = DEFAULT_NEEDS.map((need) => buildFacilityState(plan, need, minute, scenario));
  const freshSources = assets.filter((asset) => asset.freshness === "fresh").length
    + facilities.filter((facility) => facility.freshness === "fresh").length;
  const sourceCoveragePct = round(freshSources / (assets.length + facilities.length) * 100, 0);
  const roadConflict = scenario === "bridge_conflict" && minute >= 30;
  const maxSocDeviation = Math.max(...assets.map((asset) => Math.abs(asset.estimatedSoc - asset.plannedSoc)));
  const maxLoadDeviationPct = Math.max(...facilities.map((facility) => (
    Math.abs(facility.estimatedLoadKw - facility.contractLoadKw) / facility.contractLoadKw * 100
  )));
  const stalenessPenalty = (100 - sourceCoveragePct) * 0.45;
  const planDivergenceScore = round(clamp(maxSocDeviation * 3 + maxLoadDeviationPct * 0.55 + stalenessPenalty + (roadConflict ? 24 : 0), 0, 100), 0);
  const projection = forecastCriticalGap(plan, facilities, assets, minute);
  const trustState = sourceCoveragePct === 100 && !roadConflict ? "synchronized" : "degraded";
  return {
    schemaVersion: EMERGENCY_TWIN_SCHEMA_VERSION,
    simulationMinute: minute,
    scenario,
    scenarioLabel: TWIN_SCENARIOS[scenario].label,
    mode: "synthetic-tabletop",
    algorithm: "Event-sourced replay + scalar Kalman filter + deterministic 6h forecast",
    sourceCoveragePct,
    twinLagSeconds: trustState === "synchronized" ? 4 : scenario === "telemetry_loss" ? 3_600 : 75,
    trustState,
    planDivergenceScore,
    projectedCriticalGapKwh: projection.gap,
    projectedReserveBreaches: projection.reserveBreaches,
    forecastHorizonHours: 6,
    assets,
    facilities,
    roads: [{
      routeId: "east-bridge",
      state: roadConflict ? "conflicting" : "open",
      confidence: roadConflict ? 0.5 : 0.98,
      planningEffect: "not_applied",
      evidenceRequired: roadConflict,
    }],
    events: buildEvents(plan, minute, scenario),
    gates: {
      telemetryAuthority: "synthetic_only",
      worldAutoApplication: "prohibited",
      dispatch: "human_dual_control_required",
      fieldOperation: "blocked",
    },
  };
}

export async function buildEmergencyTwinEvidence(snapshot: EmergencyTwinSnapshot, plan: DispatchPlan) {
  const evidence = {
    schemaVersion: EMERGENCY_TWIN_SCHEMA_VERSION,
    twin: snapshot,
    planIdentity: {
      assignments: plan.assignments.map((assignment) => ({
        vehicleId: assignment.vehicle.id,
        needId: assignment.need.id,
        routeId: assignment.route.routeId,
        safe: assignment.safe,
      })),
      allNeedsServed: plan.allNeedsServed,
    },
    claims: {
      telemetry: "deterministic synthetic exercise data",
      estimator: "scalar Kalman state estimate with visible uncertainty",
      forecast: "deterministic six-hour projection, not a field prediction",
      actuation: "none",
    },
    gates: snapshot.gates,
  };
  return {
    ...evidence,
    evidenceDigest: `sha256:${await sha256Hex(canonicalize(evidence))}`,
  };
}
