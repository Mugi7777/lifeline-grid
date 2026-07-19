import type { RegionalPlanRequest, RegionalPlanResult } from "./regional-contract.ts";
import { canonicalJson, sha256Hex } from "./regional-contract.ts";

export type RegionalRunStatus = "draft" | "review_pending" | "approved" | "rejected" | "superseded";
export type RegionalReviewDecision = "approved" | "rejected";

export interface RegionalChangeSummary {
  baseline: boolean;
  householdCoverageDelta: number;
  vulnerableCoverageDelta: number;
  criticalFailureDelta: number;
  distanceKmDelta: number;
  unservedAdded: string[];
  unservedResolved: string[];
  routeVehiclesChanged: number;
}

export interface RegionalAuditEventInput {
  runId: string;
  sequence: number;
  eventType: "created" | "submitted" | "approved" | "rejected" | "superseded";
  actorEmail: string;
  payloadDigest: string;
  previousHash: string;
  createdAt: string;
}

export interface RegionalAuditEvent extends RegionalAuditEventInput {
  eventHash: string;
}

export interface RegionalLedgerRecord {
  ownerEmail: string;
  status: RegionalRunStatus;
  planRequest: RegionalPlanRequest;
  planResult: RegionalPlanResult;
  scenarioLabel: string;
  repairBudgetM: number | null;
  reviewerEmail: string | null;
  previousRunId: string | null;
  changeSummary: RegionalChangeSummary;
  reviewDecision: RegionalReviewDecision | null;
  reviewedBy: string | null;
  reviewComment: string | null;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function sanitizeScenarioLabel(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback.slice(0, 120);
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, 120);
}

export function normalizeRepairBudget(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return round(value, 2);
}

export function computeRegionalPlanDiff(
  previous: RegionalPlanResult | null,
  current: RegionalPlanResult,
): RegionalChangeSummary {
  if (!previous) {
    return {
      baseline: true,
      householdCoverageDelta: 0,
      vulnerableCoverageDelta: 0,
      criticalFailureDelta: 0,
      distanceKmDelta: 0,
      unservedAdded: [],
      unservedResolved: [],
      routeVehiclesChanged: 0,
    };
  }
  const previousUnserved = new Set(previous.plan.metrics.unservedDemandIds);
  const currentUnserved = new Set(current.plan.metrics.unservedDemandIds);
  const previousRoutes = new Map(previous.plan.routes.map((route) => [route.vehicle.id, route.demandIds.join("|")]));
  const currentRoutes = new Map(current.plan.routes.map((route) => [route.vehicle.id, route.demandIds.join("|")]));
  const allVehicles = new Set([...previousRoutes.keys(), ...currentRoutes.keys()]);
  return {
    baseline: false,
    householdCoverageDelta: round(current.plan.metrics.serviceCoveragePercent - previous.plan.metrics.serviceCoveragePercent),
    vulnerableCoverageDelta: round(current.plan.metrics.vulnerableCoveragePercent - previous.plan.metrics.vulnerableCoveragePercent),
    criticalFailureDelta: current.plan.metrics.criticalFailures - previous.plan.metrics.criticalFailures,
    distanceKmDelta: round(current.plan.metrics.totalDistanceKm - previous.plan.metrics.totalDistanceKm),
    unservedAdded: [...currentUnserved].filter((id) => !previousUnserved.has(id)).sort(),
    unservedResolved: [...previousUnserved].filter((id) => !currentUnserved.has(id)).sort(),
    routeVehiclesChanged: [...allVehicles].filter((id) => previousRoutes.get(id) !== currentRoutes.get(id)).length,
  };
}

export async function buildRegionalAuditEvent(input: RegionalAuditEventInput): Promise<RegionalAuditEvent> {
  const eventHash = await sha256Hex({
    runId: input.runId,
    sequence: input.sequence,
    eventType: input.eventType,
    actorEmail: input.actorEmail,
    payloadDigest: input.payloadDigest,
    previousHash: input.previousHash,
    createdAt: input.createdAt,
  });
  return { ...input, eventHash: `sha256:${eventHash}` };
}

export async function buildRegionalRecordDigest(input: Omit<RegionalLedgerRecord,
  "ownerEmail" | "status" | "reviewDecision" | "reviewedBy" | "reviewComment"
>) {
  return `sha256:${await sha256Hex({
    planRequest: input.planRequest,
    planResult: input.planResult,
    scenarioLabel: input.scenarioLabel,
    repairBudgetM: input.repairBudgetM,
    reviewerEmail: input.reviewerEmail,
    previousRunId: input.previousRunId,
    changeSummary: input.changeSummary,
  })}`;
}

export async function verifyRegionalAuditChain(events: RegionalAuditEvent[]) {
  if (events.length === 0) return false;
  let expectedPrevious = "GENESIS";
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.sequence !== index + 1 || event.previousHash !== expectedPrevious) return false;
    const expected = await buildRegionalAuditEvent({
      runId: event.runId,
      sequence: event.sequence,
      eventType: event.eventType,
      actorEmail: event.actorEmail,
      payloadDigest: event.payloadDigest,
      previousHash: event.previousHash,
      createdAt: event.createdAt,
    });
    if (expected.eventHash !== event.eventHash) return false;
    expectedPrevious = event.eventHash;
  }
  return true;
}

export async function verifyRegionalRunBindings(
  record: RegionalLedgerRecord,
  events: RegionalAuditEvent[],
) {
  if (events.length === 0 || events[0].eventType !== "created" || events[0].actorEmail !== record.ownerEmail) return false;
  const submittedEvents = events.filter((event) => event.eventType === "submitted");
  const reviewEvents = events.filter((event) => event.eventType === "approved" || event.eventType === "rejected");
  const supersededEvents = events.filter((event) => event.eventType === "superseded");
  if (submittedEvents.length > 1 || reviewEvents.length > 1 || supersededEvents.length > 1) return false;

  const allowedOrder = events.map((event) => event.eventType);
  const lifecycleRank = (eventType: RegionalAuditEvent["eventType"]) => {
    if (eventType === "created") return 0;
    if (eventType === "submitted") return 1;
    if (eventType === "approved" || eventType === "rejected") return 2;
    return 3;
  };
  if (allowedOrder.some((eventType, index) => index > 0 && lifecycleRank(eventType) < lifecycleRank(allowedOrder[index - 1]))) return false;

  const reviewerAtCreation = submittedEvents.length === 1 ? null : record.reviewerEmail;
  const createdDigest = await buildRegionalRecordDigest({
    planRequest: record.planRequest,
    planResult: record.planResult,
    scenarioLabel: record.scenarioLabel,
    repairBudgetM: record.repairBudgetM,
    reviewerEmail: reviewerAtCreation,
    previousRunId: record.previousRunId,
    changeSummary: record.changeSummary,
  });
  if (events[0].payloadDigest !== createdDigest) return false;

  if (submittedEvents.length === 1) {
    if (!record.reviewerEmail || submittedEvents[0].actorEmail !== record.ownerEmail) return false;
    const submittedDigest = `sha256:${await sha256Hex({ reviewerEmail: record.reviewerEmail })}`;
    if (submittedEvents[0].payloadDigest !== submittedDigest) return false;
  }

  if (reviewEvents.length === 1) {
    const review = reviewEvents[0];
    if (!record.reviewDecision || !record.reviewedBy || review.eventType !== record.reviewDecision) return false;
    if (record.reviewedBy !== record.reviewerEmail || review.actorEmail !== record.reviewedBy) return false;
    const reviewDigest = `sha256:${await sha256Hex(digestReviewPayload(record.reviewDecision, record.reviewComment ?? ""))}`;
    if (review.payloadDigest !== reviewDigest) return false;
  } else if (record.reviewDecision || record.reviewedBy || record.reviewComment) {
    return false;
  }

  const finalType = events.at(-1)?.eventType;
  const expectedStatus: RegionalRunStatus = finalType === "superseded"
    ? "superseded"
    : finalType === "approved" || finalType === "rejected"
      ? finalType
      : finalType === "submitted" || reviewerAtCreation
        ? "review_pending"
        : "draft";
  return record.status === expectedStatus;
}

export function digestReviewPayload(decision: RegionalReviewDecision, comment: string) {
  return canonicalJson({ decision, comment });
}
