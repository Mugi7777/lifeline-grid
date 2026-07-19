import { getD1 } from "../../../../db/index.ts";
import { REGIONAL_MODEL } from "../../../../lib/regional.ts";
import { readAuthorityTrustRegistry } from "../../../../lib/assurance-runtime.ts";
import { verifySignedAuthorityRoadEvent } from "../../../../lib/authority-event.ts";
import { readBoundedJson, regionalJson } from "../../../../lib/regional-contract.ts";
import { requireLedgerUser } from "../../regional-runs/shared.ts";

const supportedRoadSegmentIds = REGIONAL_MODEL.roads.map((road) => road.id);

export async function POST(request: Request) {
  const identity = await requireLedgerUser();
  if (!identity.ok) return identity.response;
  const decoded = await readBoundedJson(request);
  if (!decoded.ok) return regionalJson(decoded.body, decoded.status);
  const registry = await readAuthorityTrustRegistry();
  if (registry.keys.length === 0) {
    return regionalJson({
      error: "authority_trust_unconfigured",
      message: "No pinned road-authority public key is configured; the event was not accepted.",
      actionGate: "blocked",
      planningEffect: "not_applied",
    }, 503);
  }
  const verification = await verifySignedAuthorityRoadEvent({
    value: decoded.value,
    registry,
    supportedRoadSegmentIds,
  });
  if (!verification.ok) {
    const status = verification.code === "unknown_issuer" || verification.code === "unknown_key" ? 403 : 422;
    return regionalJson({ error: verification.code, ...verification }, status);
  }

  const receivedAt = new Date().toISOString();
  try {
    const db = await getD1();
    const insert = await db.prepare(`
      INSERT INTO authority_event_receipts (
        event_id, issuer, key_id, sequence, event_digest, road_segment_id,
        road_state, issued_at, expires_at, received_by, received_at, review_status
      )
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM authority_event_receipts
        WHERE event_id = ?1 OR (issuer = ?2 AND sequence >= ?4)
      )
    `).bind(
      verification.event.eventId,
      verification.event.issuer,
      verification.event.keyId,
      verification.event.sequence,
      verification.eventDigest,
      verification.event.payload.roadSegmentId,
      verification.event.payload.state,
      verification.event.issuedAt,
      verification.event.expiresAt,
      identity.user.email,
      receivedAt,
    ).run();
    if ((insert.meta.changes ?? 0) !== 1) {
      const prior = await db.prepare(`
        SELECT event_id, sequence FROM authority_event_receipts
        WHERE event_id = ?1 OR (issuer = ?2 AND sequence >= ?3)
        ORDER BY sequence DESC LIMIT 1
      `).bind(verification.event.eventId, verification.event.issuer, verification.event.sequence)
        .first<{ event_id: string; sequence: number }>();
      const exactReplay = prior?.event_id === verification.event.eventId;
      return regionalJson({
        error: exactReplay ? "replayed_event" : "stale_sequence",
        message: exactReplay
          ? "This signed event was already received."
          : `A newer or equal issuer sequence is already stored${prior ? ` (${prior.sequence})` : ""}.`,
        actionGate: "blocked",
        planningEffect: "not_applied",
      }, 409);
    }
    return regionalJson({
      verified: true,
      acceptedForReview: true,
      eventId: verification.event.eventId,
      eventDigest: verification.eventDigest,
      issuer: verification.authority.issuer,
      keyId: verification.authority.keyId,
      sequence: verification.event.sequence,
      payload: verification.event.payload,
      receivedAt,
      actionGate: verification.actionGate,
      planningEffect: verification.planningEffect,
      reviewStatus: "pending",
      warning: "Cryptographic verification proves source integrity, not road safety. An authorized human must review the official reference before any planning-state change.",
    }, 202);
  } catch (error) {
    const unavailable = error instanceof Error && /no such table|D1 binding/i.test(error.message);
    if (!unavailable) console.error("Authority event receipt failed", error instanceof Error ? error.name : "UnknownError");
    return regionalJson({
      error: "replay_store_unavailable",
      message: "The durable replay-protection store could not prove single acceptance; the event was not accepted.",
      actionGate: "blocked",
      planningEffect: "not_applied",
    }, 503);
  }
}
