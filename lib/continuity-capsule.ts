import { canonicalJson, isRecord, REGIONAL_ENGINE_VERSION, sha256Hex } from "./regional-contract.ts";
import { REGIONAL_MODEL, analyzeRegionalAccess } from "./regional.ts";

export const CONTINUITY_CAPSULE_SCHEMA_VERSION = "2026-07-19.1";
export const CONTINUITY_CAPSULE_MAX_BYTES = 250_000;
export const CONTINUITY_STALE_AFTER_HOURS = 24;

export interface ContinuityPlanSummary {
  serviceCoveragePercent: number;
  vulnerableCoveragePercent: number;
  criticalFailures: number;
  totalDistanceKm: number;
  householdsCovered: number;
  vulnerableResidentsCovered: number;
  selectedRepairRoadIds: string[];
  repairCostM: number;
}

export interface ContinuityCapsulePayload {
  schemaVersion: typeof CONTINUITY_CAPSULE_SCHEMA_VERSION;
  capsuleId: string;
  createdAt: string;
  sourceMode: "synthetic_demo";
  district: string;
  modelDigest: string;
  engineVersion: typeof REGIONAL_ENGINE_VERSION;
  closedRoadIds: string[];
  repairBudgetM: number;
  expectedPlan: ContinuityPlanSummary;
  planDigest: string;
  safetyBoundary: string;
}

export interface PortableTwinCapsule {
  payload: ContinuityCapsulePayload;
  payloadDigest: string;
}

export type ContinuityVerificationResult =
  | {
      ok: true;
      status: "verified" | "verified_stale";
      capsule: PortableTwinCapsule;
      ageHours: number;
      restore: { closedSegmentId: string | null; repairBudgetM: number };
      warnings: string[];
    }
  | {
      ok: false;
      code: "malformed_capsule" | "digest_mismatch" | "model_mismatch" | "plan_mismatch" | "future_capsule";
      message: string;
    };

const CAPSULE_KEYS = ["payload", "payloadDigest"];
const PAYLOAD_KEYS = [
  "schemaVersion", "capsuleId", "createdAt", "sourceMode", "district", "modelDigest", "engineVersion",
  "closedRoadIds", "repairBudgetM", "expectedPlan", "planDigest", "safetyBoundary",
];
const PLAN_KEYS = [
  "serviceCoveragePercent", "vulnerableCoveragePercent", "criticalFailures", "totalDistanceKm",
  "householdsCovered", "vulnerableResidentsCovered", "selectedRepairRoadIds", "repairCostM",
];

function hasOnlyKeys(record: Record<string, unknown>, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isIdentifier(value: unknown) {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

function isDigest(value: unknown) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || value.length > 35 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function planSummary(closedSegmentId: string | null, repairBudgetM: number): ContinuityPlanSummary {
  const analysis = analyzeRegionalAccess(closedSegmentId, repairBudgetM);
  return {
    serviceCoveragePercent: analysis.activePlan.metrics.serviceCoveragePercent,
    vulnerableCoveragePercent: analysis.activePlan.metrics.vulnerableCoveragePercent,
    criticalFailures: analysis.activePlan.metrics.criticalFailures,
    totalDistanceKm: analysis.activePlan.metrics.totalDistanceKm,
    householdsCovered: analysis.activePlan.metrics.householdsCovered,
    vulnerableResidentsCovered: analysis.activePlan.metrics.vulnerableResidentsCovered,
    selectedRepairRoadIds: analysis.repairPortfolio.selectedRoads.map((item) => item.road.id).sort(),
    repairCostM: analysis.repairPortfolio.costM,
  };
}

function planEvidence(closedSegmentId: string | null, repairBudgetM: number, summary: ContinuityPlanSummary) {
  const analysis = analyzeRegionalAccess(closedSegmentId, repairBudgetM);
  return {
    engineVersion: REGIONAL_ENGINE_VERSION,
    closedRoadIds: closedSegmentId ? [closedSegmentId] : [],
    repairBudgetM,
    summary,
    routeEvidence: analysis.activePlan.routes.map((route) => ({
      vehicleId: route.vehicle.id,
      demandIds: [...route.demandIds],
      usedRoadSegmentIds: [...route.usedRoadSegmentIds],
      totalMinutes: route.totalMinutes,
    })),
  };
}

function parsePlanSummary(value: unknown): ContinuityPlanSummary | null {
  if (!isRecord(value)
    || !hasOnlyKeys(value, PLAN_KEYS)
    || !isFiniteNumber(value.serviceCoveragePercent)
    || !isFiniteNumber(value.vulnerableCoveragePercent)
    || !Number.isSafeInteger(value.criticalFailures)
    || !isFiniteNumber(value.totalDistanceKm)
    || !Number.isSafeInteger(value.householdsCovered)
    || !Number.isSafeInteger(value.vulnerableResidentsCovered)
    || !Array.isArray(value.selectedRepairRoadIds)
    || !value.selectedRepairRoadIds.every(isIdentifier)
    || new Set(value.selectedRepairRoadIds).size !== value.selectedRepairRoadIds.length
    || !isFiniteNumber(value.repairCostM)) return null;
  return {
    serviceCoveragePercent: value.serviceCoveragePercent as number,
    vulnerableCoveragePercent: value.vulnerableCoveragePercent as number,
    criticalFailures: value.criticalFailures as number,
    totalDistanceKm: value.totalDistanceKm as number,
    householdsCovered: value.householdsCovered as number,
    vulnerableResidentsCovered: value.vulnerableResidentsCovered as number,
    selectedRepairRoadIds: [...value.selectedRepairRoadIds] as string[],
    repairCostM: value.repairCostM as number,
  };
}

function parseCapsule(value: unknown): PortableTwinCapsule | null {
  if (!isRecord(value) || !hasOnlyKeys(value, CAPSULE_KEYS) || !isRecord(value.payload) || !isDigest(value.payloadDigest)) return null;
  const payload = value.payload;
  const expectedPlan = parsePlanSummary(payload.expectedPlan);
  if (!hasOnlyKeys(payload, PAYLOAD_KEYS)
    || payload.schemaVersion !== CONTINUITY_CAPSULE_SCHEMA_VERSION
    || !isIdentifier(payload.capsuleId)
    || parseTimestamp(payload.createdAt) === null
    || payload.sourceMode !== "synthetic_demo"
    || payload.district !== REGIONAL_MODEL.district
    || !isDigest(payload.modelDigest)
    || payload.engineVersion !== REGIONAL_ENGINE_VERSION
    || !Array.isArray(payload.closedRoadIds)
    || payload.closedRoadIds.length > 1
    || !payload.closedRoadIds.every(isIdentifier)
    || !Number.isInteger(payload.repairBudgetM)
    || (payload.repairBudgetM as number) < 40
    || (payload.repairBudgetM as number) > 200
    || (payload.repairBudgetM as number) % 10 !== 0
    || !expectedPlan
    || !isDigest(payload.planDigest)
    || typeof payload.safetyBoundary !== "string"
    || payload.safetyBoundary.length < 20
    || payload.safetyBoundary.length > 500) return null;
  const closedRoadIds = payload.closedRoadIds as string[];
  if (closedRoadIds.some((roadId) => !REGIONAL_MODEL.roads.some((road) => road.id === roadId))) return null;
  return {
    payload: {
      schemaVersion: CONTINUITY_CAPSULE_SCHEMA_VERSION,
      capsuleId: payload.capsuleId as string,
      createdAt: payload.createdAt as string,
      sourceMode: "synthetic_demo",
      district: REGIONAL_MODEL.district,
      modelDigest: payload.modelDigest as string,
      engineVersion: REGIONAL_ENGINE_VERSION,
      closedRoadIds: [...closedRoadIds],
      repairBudgetM: payload.repairBudgetM as number,
      expectedPlan,
      planDigest: payload.planDigest as string,
      safetyBoundary: payload.safetyBoundary,
    },
    payloadDigest: value.payloadDigest as string,
  };
}

export async function buildContinuityCapsule(
  closedSegmentId: string | null,
  repairBudgetM: number,
  createdAt = new Date().toISOString(),
): Promise<PortableTwinCapsule> {
  if (closedSegmentId !== null && !REGIONAL_MODEL.roads.some((road) => road.id === closedSegmentId)) throw new Error("Unknown road segment");
  if (!Number.isInteger(repairBudgetM) || repairBudgetM < 40 || repairBudgetM > 200 || repairBudgetM % 10 !== 0) throw new Error("Repair budget is outside the portable capsule contract");
  if (parseTimestamp(createdAt) === null) throw new Error("Capsule timestamp is invalid");
  const expectedPlan = planSummary(closedSegmentId, repairBudgetM);
  const modelDigest = `sha256:${await sha256Hex(REGIONAL_MODEL)}`;
  const planDigest = `sha256:${await sha256Hex(planEvidence(closedSegmentId, repairBudgetM, expectedPlan))}`;
  const capsuleSeed = await sha256Hex({ createdAt, closedSegmentId, repairBudgetM, modelDigest, planDigest });
  const payload: ContinuityCapsulePayload = {
    schemaVersion: CONTINUITY_CAPSULE_SCHEMA_VERSION,
    capsuleId: `twin-${capsuleSeed.slice(0, 20)}`,
    createdAt,
    sourceMode: "synthetic_demo",
    district: REGIONAL_MODEL.district,
    modelDigest,
    engineVersion: REGIONAL_ENGINE_VERSION,
    closedRoadIds: closedSegmentId ? [closedSegmentId] : [],
    repairBudgetM,
    expectedPlan,
    planDigest,
    safetyBoundary: "Portable integrity evidence only; this is not an identity signature, live-data backup, safety certificate, or authority to act.",
  };
  return { payload, payloadDigest: `sha256:${await sha256Hex(payload)}` };
}

export async function verifyContinuityCapsule(value: unknown, nowMs = Date.now()): Promise<ContinuityVerificationResult> {
  const capsule = parseCapsule(value);
  if (!capsule) return { ok: false, code: "malformed_capsule", message: "The file does not satisfy the bounded portable-twin schema." };
  if (capsule.payloadDigest !== `sha256:${await sha256Hex(capsule.payload)}`) {
    return { ok: false, code: "digest_mismatch", message: "The capsule payload changed after its integrity digest was created." };
  }
  const currentModelDigest = `sha256:${await sha256Hex(REGIONAL_MODEL)}`;
  if (capsule.payload.modelDigest !== currentModelDigest) {
    return { ok: false, code: "model_mismatch", message: "This capsule targets a different regional model release." };
  }
  const closedSegmentId = capsule.payload.closedRoadIds[0] ?? null;
  const expectedPlan = planSummary(closedSegmentId, capsule.payload.repairBudgetM);
  const planDigest = `sha256:${await sha256Hex(planEvidence(closedSegmentId, capsule.payload.repairBudgetM, expectedPlan))}`;
  if (canonicalJson(expectedPlan) !== canonicalJson(capsule.payload.expectedPlan) || planDigest !== capsule.payload.planDigest) {
    return { ok: false, code: "plan_mismatch", message: "The deterministic planner cannot reproduce the capsule evidence." };
  }
  const createdAtMs = Date.parse(capsule.payload.createdAt);
  if (!Number.isFinite(nowMs) || createdAtMs > nowMs + 5 * 60 * 1000) {
    return { ok: false, code: "future_capsule", message: "The capsule timestamp is ahead of the verification clock." };
  }
  const ageHours = Math.max(0, Number(((nowMs - createdAtMs) / 3_600_000).toFixed(2)));
  const stale = ageHours > CONTINUITY_STALE_AFTER_HOURS;
  return {
    ok: true,
    status: stale ? "verified_stale" : "verified",
    capsule,
    ageHours,
    restore: { closedSegmentId, repairBudgetM: capsule.payload.repairBudgetM },
    warnings: [
      stale ? `Snapshot age exceeds ${CONTINUITY_STALE_AFTER_HOURS} hours; refresh every operational source before review.` : "Snapshot age is within the portable continuity window.",
      "Browser storage and a JSON file are not substitutes for encrypted, tested organizational backups.",
      capsule.payload.safetyBoundary,
    ],
  };
}

export function serializedCapsuleBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
