import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORITY_EVENT_SCHEMA_VERSION,
  AUTHORITY_SIGNATURE_ALGORITHM,
  authoritySigningPayload,
  parseSignedAuthorityRoadEvent,
  parseAuthorityTrustRegistry,
  verifySignedAuthorityRoadEvent,
  type SignedAuthorityRoadEvent,
} from "../lib/authority-event.ts";

function base64Url(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64url");
}

async function signedFixture() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const event: SignedAuthorityRoadEvent = {
    schemaVersion: AUTHORITY_EVENT_SCHEMA_VERSION,
    eventId: "road-event-00000001",
    issuer: "https://roads.example.go.jp/authority",
    keyId: "road-signing-2026-01",
    issuedAt: "2026-07-19T10:00:00.000Z",
    expiresAt: "2026-07-19T18:00:00.000Z",
    sequence: 421,
    payload: {
      roadSegmentId: "center-north",
      state: "closed",
      weightLimitT: null,
      effectiveFrom: "2026-07-19T10:00:00.000Z",
      effectiveUntil: "2026-07-19T18:00:00.000Z",
      authorityReference: "https://roads.example.go.jp/events/421",
      reason: "Retaining-wall inspection in progress.",
    },
    signature: "",
  };
  event.signature = base64Url(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(authoritySigningPayload(event)),
  ));
  const registry = parseAuthorityTrustRegistry({
    keys: [{
      issuer: event.issuer,
      keyId: event.keyId,
      algorithm: AUTHORITY_SIGNATURE_ALGORITHM,
      publicKeyJwk,
      allowedRoadSegmentIds: ["center-north"],
    }],
  });
  return { event, registry, publicKeyJwk };
}

test("authority event accepts a valid pinned signature only for human review", async () => {
  const { event, registry } = await signedFixture();
  const result = await verifySignedAuthorityRoadEvent({
    value: event,
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T10:01:00.000Z"),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.actionGate, "human_review_required");
  assert.equal(result.planningEffect, "not_applied");
  assert.match(result.eventDigest, /^sha256:[0-9a-f]{64}$/);
});

test("authority event rejects tampering after signing", async () => {
  const { event, registry } = await signedFixture();
  const result = await verifySignedAuthorityRoadEvent({
    value: { ...event, payload: { ...event.payload, reason: "Tampered reason" } },
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T10:01:00.000Z"),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid_signature");
});

test("authority event accepts every valid base64url signature prefix", async () => {
  const { event } = await signedFixture();
  for (const prefix of ["-", "_", "A", "9"]) {
    const parsed = parseSignedAuthorityRoadEvent({ ...event, signature: `${prefix}${"A".repeat(63)}` });
    assert.equal(parsed.ok, true, `${prefix} is legal at the start of an unpadded base64url signature`);
  }
});

test("authority event fails closed for an untrusted issuer and road scope", async () => {
  const { event, registry } = await signedFixture();
  const unknownIssuer = await verifySignedAuthorityRoadEvent({
    value: { ...event, issuer: "https://attacker.example/authority" },
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T10:01:00.000Z"),
  });
  assert.equal(unknownIssuer.ok, false);
  if (!unknownIssuer.ok) assert.equal(unknownIssuer.code, "unknown_issuer");

  const outOfScope = await verifySignedAuthorityRoadEvent({
    value: event,
    registry,
    supportedRoadSegmentIds: ["center-south"],
    now: new Date("2026-07-19T10:01:00.000Z"),
  });
  assert.equal(outOfScope.ok, false);
  if (!outOfScope.ok) assert.equal(outOfScope.code, "road_outside_authority_scope");
});

test("authority event rejects expired, future, and inconsistent windows", async () => {
  const { event, registry } = await signedFixture();
  const expired = await verifySignedAuthorityRoadEvent({
    value: event,
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T18:00:00.000Z"),
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.code, "expired_event");

  const future = await verifySignedAuthorityRoadEvent({
    value: event,
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T09:00:00.000Z"),
  });
  assert.equal(future.ok, false);
  if (!future.ok) assert.equal(future.code, "not_yet_valid");

  const inconsistent = await verifySignedAuthorityRoadEvent({
    value: { ...event, payload: { ...event.payload, effectiveUntil: "2026-07-20T18:00:00.000Z" } },
    registry,
    supportedRoadSegmentIds: ["center-north"],
    now: new Date("2026-07-19T10:01:00.000Z"),
  });
  assert.equal(inconsistent.ok, false);
  if (!inconsistent.ok) assert.equal(inconsistent.code, "invalid_payload");
});

test("trust registry rejects private key material", async () => {
  const { event, publicKeyJwk } = await signedFixture();
  const registry = parseAuthorityTrustRegistry({
    keys: [{
      issuer: event.issuer,
      keyId: event.keyId,
      algorithm: AUTHORITY_SIGNATURE_ALGORITHM,
      publicKeyJwk: { ...publicKeyJwk, d: "private-material-must-never-be-here" },
      allowedRoadSegmentIds: ["center-north"],
    }],
  });
  assert.deepEqual(registry, { keys: [] });
});
