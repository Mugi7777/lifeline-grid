import { getD1 } from "../../../../../db";
import { readBoundedJson, regionalJson, sha256Hex } from "../../../../../lib/regional-contract";
import { buildRegionalAuditEvent } from "../../../../../lib/regional-ledger";
import { ledgerFailure, normalizeReviewerEmail, requireLedgerUser } from "../../shared";

interface RunRow {
  id: string;
  owner_email: string;
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
  const reviewerEmail = typeof decoded.value === "object" && decoded.value !== null
    ? normalizeReviewerEmail((decoded.value as { reviewerEmail?: unknown }).reviewerEmail)
    : false;
  if (!reviewerEmail || reviewerEmail === identity.user.email) {
    return regionalJson({ error: "independent_reviewer_required" }, 422);
  }

  try {
    const db = await getD1();
    const run = await db.prepare("SELECT id, owner_email, status FROM regional_runs WHERE id = ?1 AND owner_email = ?2")
      .bind(id, identity.user.email).first<RunRow>();
    if (!run) return regionalJson({ error: "run_not_found" }, 404);
    if (run.status !== "draft") return regionalJson({ error: "run_not_draft", status: run.status }, 409);
    const last = await db.prepare(`
      SELECT sequence, event_hash FROM regional_audit_events
      WHERE run_id = ?1 ORDER BY sequence DESC LIMIT 1
    `).bind(id).first<AuditRow>();
    if (!last) return regionalJson({ error: "audit_chain_missing" }, 409);
    const createdAt = new Date().toISOString();
    const payloadDigest = `sha256:${await sha256Hex({ reviewerEmail })}`;
    const event = await buildRegionalAuditEvent({
      runId: id,
      sequence: last.sequence + 1,
      eventType: "submitted",
      actorEmail: identity.user.email,
      payloadDigest,
      previousHash: last.event_hash,
      createdAt,
    });
    await db.batch([
      db.prepare(`
        UPDATE regional_runs
        SET status = 'review_pending', reviewer_email = ?1, updated_at = ?2
        WHERE id = ?3 AND owner_email = ?4 AND status = 'draft'
      `).bind(reviewerEmail, createdAt, id, identity.user.email),
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
    return regionalJson({ run: { id, status: "review_pending", reviewerEmail }, audit: { sequence: event.sequence, eventHash: event.eventHash } });
  } catch (error) {
    return ledgerFailure(error);
  }
}
