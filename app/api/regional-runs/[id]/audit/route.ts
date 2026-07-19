import { getD1 } from "../../../../../db";
import { regionalJson, type RegionalPlanRequest, type RegionalPlanResult } from "../../../../../lib/regional-contract";
import {
  verifyRegionalAuditChain,
  verifyRegionalRunBindings,
  type RegionalAuditEvent,
  type RegionalChangeSummary,
  type RegionalReviewDecision,
  type RegionalRunStatus,
} from "../../../../../lib/regional-ledger";
import { ledgerFailure, requireLedgerUser } from "../../shared";

interface AccessRow {
  owner_email: string;
  reviewer_email: string | null;
  status: RegionalRunStatus;
  request_json: string;
  result_json: string;
  scenario_label: string;
  repair_budget_m: number | null;
  previous_run_id: string | null;
  change_summary_json: string;
  reviewed_by: string | null;
  review_comment: string | null;
}

interface ReviewRow {
  decision: RegionalReviewDecision;
}

interface AuditRow {
  run_id: string;
  sequence: number;
  event_type: RegionalAuditEvent["eventType"];
  actor_email: string;
  payload_digest: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await requireLedgerUser();
  if (!identity.ok) return identity.response;
  const { id } = await context.params;
  if (!/^run-[0-9a-f-]{36}$/.test(id)) return regionalJson({ error: "invalid_run_id" }, 422);
  try {
    const db = await getD1();
    const access = await db.prepare(`
      SELECT owner_email, reviewer_email, status, request_json, result_json,
             scenario_label, repair_budget_m, previous_run_id,
             change_summary_json, reviewed_by, review_comment
      FROM regional_runs WHERE id = ?1
    `)
      .bind(id).first<AccessRow>();
    if (!access || (access.owner_email !== identity.user.email && access.reviewer_email !== identity.user.email)) {
      return regionalJson({ error: "run_not_found" }, 404);
    }
    const result = await db.prepare(`
      SELECT run_id, sequence, event_type, actor_email, payload_digest,
             previous_hash, event_hash, created_at
      FROM regional_audit_events WHERE run_id = ?1 ORDER BY sequence ASC
    `).bind(id).all<AuditRow>();
    const events: RegionalAuditEvent[] = (result.results ?? []).map((event) => ({
      runId: event.run_id,
      sequence: event.sequence,
      eventType: event.event_type,
      actorEmail: event.actor_email,
      payloadDigest: event.payload_digest,
      previousHash: event.previous_hash,
      eventHash: event.event_hash,
      createdAt: event.created_at,
    }));
    const review = await db.prepare("SELECT decision FROM regional_run_reviews WHERE run_id = ?1 LIMIT 1")
      .bind(id).first<ReviewRow>();
    const eventChainVerified = await verifyRegionalAuditChain(events);
    let recordBindingVerified = false;
    try {
      recordBindingVerified = await verifyRegionalRunBindings({
        ownerEmail: access.owner_email,
        status: access.status,
        planRequest: JSON.parse(access.request_json) as RegionalPlanRequest,
        planResult: JSON.parse(access.result_json) as RegionalPlanResult,
        scenarioLabel: access.scenario_label,
        repairBudgetM: access.repair_budget_m,
        reviewerEmail: access.reviewer_email,
        previousRunId: access.previous_run_id,
        changeSummary: JSON.parse(access.change_summary_json) as RegionalChangeSummary,
        reviewDecision: review?.decision ?? null,
        reviewedBy: access.reviewed_by,
        reviewComment: access.review_comment,
      }, events);
    } catch {
      recordBindingVerified = false;
    }
    return regionalJson({
      runId: id,
      verified: eventChainVerified && recordBindingVerified,
      checks: { eventChain: eventChainVerified, recordBinding: recordBindingVerified },
      events,
    });
  } catch (error) {
    return ledgerFailure(error);
  }
}
