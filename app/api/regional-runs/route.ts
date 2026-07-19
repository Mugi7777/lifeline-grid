import { getD1 } from "../../../db";
import {
  buildRegionalPlanResult,
  canonicalJson,
  isRecord,
  parseRegionalPlanRequest,
  readBoundedJson,
  regionalJson,
  type RegionalPlanResult,
} from "../../../lib/regional-contract";
import {
  buildRegionalAuditEvent,
  buildRegionalRecordDigest,
  computeRegionalPlanDiff,
  normalizeRepairBudget,
  sanitizeScenarioLabel,
} from "../../../lib/regional-ledger";
import { ledgerFailure, normalizeReviewerEmail, requireLedgerUser } from "./shared";

interface StoredRun {
  id: string;
  owner_email: string;
  district: string;
  scenario_label: string;
  status: string;
  engine_version: string;
  input_digest: string;
  result_json: string;
  algorithm: string;
  optimality_certified: number;
  household_coverage_percent: number;
  vulnerable_coverage_percent: number;
  critical_failures: number;
  total_distance_km: number;
  repair_budget_m: number | null;
  previous_run_id: string | null;
  change_summary_json: string;
  reviewer_email: string | null;
  reviewed_by: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PreviousRun {
  id: string;
  owner_email: string;
  status: string;
  result_json: string;
}

interface LastAudit {
  sequence: number;
  event_hash: string;
}

export async function GET() {
  const identity = await requireLedgerUser();
  if (!identity.ok) return identity.response;
  try {
    const db = await getD1();
    const result = await db.prepare(`
      SELECT id, owner_email, district, scenario_label, status, engine_version,
             input_digest, algorithm, optimality_certified,
             household_coverage_percent, vulnerable_coverage_percent,
             critical_failures, total_distance_km, repair_budget_m,
             previous_run_id, change_summary_json, reviewer_email,
             reviewed_by, review_comment, reviewed_at, created_at, updated_at
      FROM regional_runs
      WHERE owner_email = ?1 OR reviewer_email = ?1
      ORDER BY created_at DESC, id DESC
      LIMIT 30
    `).bind(identity.user.email).all<Omit<StoredRun, "result_json">>();
    const runs = (result.results ?? []).map((run) => ({
      id: run.id,
      role: run.owner_email === identity.user.email ? "owner" : "reviewer",
      district: run.district,
      scenarioLabel: run.scenario_label,
      status: run.status,
      engineVersion: run.engine_version,
      inputDigest: run.input_digest,
      algorithm: run.algorithm,
      optimalityCertified: Boolean(run.optimality_certified),
      metrics: {
        householdCoveragePercent: run.household_coverage_percent,
        vulnerableCoveragePercent: run.vulnerable_coverage_percent,
        criticalFailures: run.critical_failures,
        totalDistanceKm: run.total_distance_km,
      },
      repairBudgetM: run.repair_budget_m,
      previousRunId: run.previous_run_id,
      changeSummary: JSON.parse(run.change_summary_json),
      reviewerEmail: run.reviewer_email,
      reviewedBy: run.reviewed_by,
      reviewComment: run.review_comment,
      reviewedAt: run.reviewed_at,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    }));
    return regionalJson({ user: { displayName: identity.user.displayName, email: identity.user.email }, runs });
  } catch (error) {
    return ledgerFailure(error);
  }
}

export async function POST(request: Request) {
  const identity = await requireLedgerUser();
  if (!identity.ok) return identity.response;
  const decoded = await readBoundedJson(request);
  if (!decoded.ok) return regionalJson(decoded.body, decoded.status);
  if (!isRecord(decoded.value)
    || !isRecord(decoded.value.planRequest)
    || Object.keys(decoded.value).some((key) => !["planRequest", "scenarioLabel", "repairBudgetM", "previousRunId", "reviewerEmail"].includes(key))) {
    return regionalJson({ error: "invalid_ledger_request" }, 422);
  }
  const parsed = parseRegionalPlanRequest(decoded.value.planRequest);
  if (!parsed.ok) return regionalJson(parsed.body, parsed.status);
  const reviewerEmail = normalizeReviewerEmail(decoded.value.reviewerEmail);
  if (reviewerEmail === false || reviewerEmail === identity.user.email) {
    return regionalJson({ error: "independent_reviewer_required", message: "Reviewer must be a different valid email address." }, 422);
  }
  const repairBudgetM = normalizeRepairBudget(decoded.value.repairBudgetM);
  if (decoded.value.repairBudgetM !== null && decoded.value.repairBudgetM !== undefined && repairBudgetM === null) {
    return regionalJson({ error: "invalid_repair_budget" }, 422);
  }
  const previousRunId = typeof decoded.value.previousRunId === "string" && /^run-[0-9a-f-]{36}$/.test(decoded.value.previousRunId)
    ? decoded.value.previousRunId
    : null;
  if (decoded.value.previousRunId && !previousRunId) return regionalJson({ error: "invalid_previous_run_id" }, 422);

  try {
    const db = await getD1();
    let previous: PreviousRun | null = null;
    let previousResult: RegionalPlanResult | null = null;
    let previousAudit: LastAudit | null = null;
    if (previousRunId) {
      previous = await db.prepare(`
        SELECT id, owner_email, status, result_json
        FROM regional_runs WHERE id = ?1 AND owner_email = ?2
      `).bind(previousRunId, identity.user.email).first<PreviousRun>();
      if (!previous) return regionalJson({ error: "previous_run_not_found" }, 404);
      previousResult = JSON.parse(previous.result_json) as RegionalPlanResult;
      previousAudit = await db.prepare(`
        SELECT sequence, event_hash FROM regional_audit_events
        WHERE run_id = ?1 ORDER BY sequence DESC LIMIT 1
      `).bind(previousRunId).first<LastAudit>();
    }

    const result = await buildRegionalPlanResult(parsed.value);
    const changeSummary = computeRegionalPlanDiff(previousResult, result);
    const scenarioFallback = parsed.value.closedRoadIds.length > 0
      ? `Road restriction: ${parsed.value.closedRoadIds.join(", ")}`
      : "Baseline regional plan";
    const scenarioLabel = sanitizeScenarioLabel(decoded.value.scenarioLabel, scenarioFallback);
    const runId = `run-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const status = reviewerEmail ? "review_pending" : "draft";
    const recordDigest = await buildRegionalRecordDigest({
      planRequest: parsed.value,
      planResult: result,
      scenarioLabel,
      repairBudgetM,
      reviewerEmail,
      previousRunId,
      changeSummary,
    });
    const createdEvent = await buildRegionalAuditEvent({
      runId,
      sequence: 1,
      eventType: "created",
      actorEmail: identity.user.email,
      payloadDigest: recordDigest,
      previousHash: "GENESIS",
      createdAt,
    });
    const statements = [
      db.prepare(`
        INSERT INTO regional_runs (
          id, owner_email, district, scenario_label, status, schema_version,
          engine_version, input_digest, request_json, result_json, algorithm,
          optimality_certified, household_coverage_percent,
          vulnerable_coverage_percent, critical_failures, total_distance_km,
          closed_road_ids_json, repair_budget_m, previous_run_id,
          change_summary_json, reviewer_email, created_at, updated_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
          ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?22
        )
      `).bind(
        runId, identity.user.email, parsed.value.model.district, scenarioLabel,
        status, result.schemaVersion, result.engineVersion, result.inputDigest,
        canonicalJson(parsed.value), canonicalJson(result), result.plan.algorithm,
        result.plan.optimalityCertified ? 1 : 0,
        result.plan.metrics.serviceCoveragePercent,
        result.plan.metrics.vulnerableCoveragePercent,
        result.plan.metrics.criticalFailures,
        result.plan.metrics.totalDistanceKm,
        canonicalJson(parsed.value.closedRoadIds), repairBudgetM, previousRunId,
        canonicalJson(changeSummary), reviewerEmail, createdAt,
      ),
      db.prepare(`
        INSERT INTO regional_audit_events (
          run_id, sequence, event_type, actor_email, payload_digest,
          previous_hash, event_hash, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `).bind(
        createdEvent.runId, createdEvent.sequence, createdEvent.eventType,
        createdEvent.actorEmail, createdEvent.payloadDigest,
        createdEvent.previousHash, createdEvent.eventHash, createdEvent.createdAt,
      ),
    ];
    if (previous && previous.status !== "superseded" && previousAudit) {
      const supersededEvent = await buildRegionalAuditEvent({
        runId: previous.id,
        sequence: previousAudit.sequence + 1,
        eventType: "superseded",
        actorEmail: identity.user.email,
        payloadDigest: recordDigest,
        previousHash: previousAudit.event_hash,
        createdAt,
      });
      statements.push(
        db.prepare("UPDATE regional_runs SET status = 'superseded', updated_at = ?1 WHERE id = ?2 AND owner_email = ?3")
          .bind(createdAt, previous.id, identity.user.email),
        db.prepare(`
          INSERT INTO regional_audit_events (
            run_id, sequence, event_type, actor_email, payload_digest,
            previous_hash, event_hash, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        `).bind(
          supersededEvent.runId, supersededEvent.sequence, supersededEvent.eventType,
          supersededEvent.actorEmail, supersededEvent.payloadDigest,
          supersededEvent.previousHash, supersededEvent.eventHash, supersededEvent.createdAt,
        ),
      );
    }
    await db.batch(statements);
    return regionalJson({
      run: {
        id: runId,
        role: "owner",
        district: parsed.value.model.district,
        scenarioLabel,
        status,
        inputDigest: result.inputDigest,
        algorithm: result.plan.algorithm,
        optimalityCertified: result.plan.optimalityCertified,
        metrics: {
          householdCoveragePercent: result.plan.metrics.serviceCoveragePercent,
          vulnerableCoveragePercent: result.plan.metrics.vulnerableCoveragePercent,
          criticalFailures: result.plan.metrics.criticalFailures,
          totalDistanceKm: result.plan.metrics.totalDistanceKm,
        },
        repairBudgetM,
        previousRunId,
        changeSummary,
        reviewerEmail,
        createdAt,
      },
      audit: { sequence: createdEvent.sequence, eventHash: createdEvent.eventHash },
    }, 201);
  } catch (error) {
    return ledgerFailure(error);
  }
}
