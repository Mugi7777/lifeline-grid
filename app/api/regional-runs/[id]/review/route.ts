import { getD1 } from "../../../../../db";
import { isRecord, readBoundedJson, regionalJson, sha256Hex } from "../../../../../lib/regional-contract";
import { buildRegionalAuditEvent, digestReviewPayload } from "../../../../../lib/regional-ledger";
import { ledgerFailure, requireLedgerUser } from "../../shared";

interface RunRow {
  id: string;
  owner_email: string;
  reviewer_email: string | null;
  status: string;
}

interface AuditRow {
  sequence: number;
  event_hash: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await requireLedgerUser();
  if (!identity.ok) return identity.response;
  const { id } = await context.params;
  if (!/^run-[0-9a-f-]{36}$/.test(id)) return regionalJson({ error: "invalid_run_id" }, 422);
  const decoded = await readBoundedJson(request);
  if (!decoded.ok) return regionalJson(decoded.body, decoded.status);
  if (!isRecord(decoded.value) || Object.keys(decoded.value).some((key) => !["decision", "comment"].includes(key))) {
    return regionalJson({ error: "invalid_review_request" }, 422);
  }
  const decision = decoded.value.decision;
  const comment = typeof decoded.value.comment === "string"
    ? decoded.value.comment.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500)
    : "";
  if (decision !== "approved" && decision !== "rejected") return regionalJson({ error: "invalid_review_decision" }, 422);

  try {
    const db = await getD1();
    const run = await db.prepare(`
      SELECT id, owner_email, reviewer_email, status FROM regional_runs
      WHERE id = ?1 AND reviewer_email = ?2
    `).bind(id, identity.user.email).first<RunRow>();
    if (!run) return regionalJson({ error: "review_assignment_not_found" }, 404);
    if (run.owner_email === identity.user.email) return regionalJson({ error: "independent_reviewer_required" }, 409);
    if (run.status !== "review_pending") return regionalJson({ error: "run_not_reviewable", status: run.status }, 409);
    const last = await db.prepare(`
      SELECT sequence, event_hash FROM regional_audit_events
      WHERE run_id = ?1 ORDER BY sequence DESC LIMIT 1
    `).bind(id).first<AuditRow>();
    if (!last) return regionalJson({ error: "audit_chain_missing" }, 409);
    const createdAt = new Date().toISOString();
    const payloadDigest = `sha256:${await sha256Hex(digestReviewPayload(decision, comment))}`;
    const event = await buildRegionalAuditEvent({
      runId: id,
      sequence: last.sequence + 1,
      eventType: decision,
      actorEmail: identity.user.email,
      payloadDigest,
      previousHash: last.event_hash,
      createdAt,
    });
    await db.batch([
      db.prepare(`
        INSERT INTO regional_run_reviews (run_id, reviewer_email, decision, comment, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
      `).bind(id, identity.user.email, decision, comment, createdAt),
      db.prepare(`
        UPDATE regional_runs
        SET status = ?1, reviewed_by = ?2, review_comment = ?3,
            reviewed_at = ?4, updated_at = ?4
        WHERE id = ?5 AND reviewer_email = ?2 AND status = 'review_pending'
      `).bind(decision, identity.user.email, comment, createdAt, id),
      db.prepare(`
        INSERT INTO regional_audit_events (
          run_id, sequence, event_type, actor_email, payload_digest,
          previous_hash, event_hash, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `).bind(
        event.runId, event.sequence, event.eventType, event.actorEmail,
        event.payloadDigest, event.previousHash, event.eventHash, event.createdAt,
      ),
    ]);
    return regionalJson({
      run: { id, status: decision, reviewedBy: identity.user.email, reviewComment: comment, reviewedAt: createdAt },
      audit: { sequence: event.sequence, eventHash: event.eventHash },
    });
  } catch (error) {
    return ledgerFailure(error);
  }
}
