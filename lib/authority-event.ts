import { canonicalJson, isRecord, sha256Hex } from "./regional-contract.ts";

export const AUTHORITY_EVENT_SCHEMA_VERSION = "2026-07-19";
export const AUTHORITY_SIGNATURE_ALGORITHM = "ECDSA_P256_SHA256";
export const AUTHORITY_EVENT_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const AUTHORITY_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type AuthorityRoadState = "open" | "closed" | "weight_limited";

export interface AuthorityRoadEventPayload {
  roadSegmentId: string;
  state: AuthorityRoadState;
  weightLimitT: number | null;
  effectiveFrom: string;
  effectiveUntil: string;
  authorityReference: string;
  reason: string;
}

export interface SignedAuthorityRoadEvent {
  schemaVersion: typeof AUTHORITY_EVENT_SCHEMA_VERSION;
  eventId: string;
  issuer: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string;
  sequence: number;
  payload: AuthorityRoadEventPayload;
  signature: string;
}

export interface AuthorityTrustKey {
  issuer: string;
  keyId: string;
  algorithm: typeof AUTHORITY_SIGNATURE_ALGORITHM;
  publicKeyJwk: JsonWebKey;
  allowedRoadSegmentIds: string[];
}

export interface AuthorityTrustRegistry {
  keys: AuthorityTrustKey[];
}

export type AuthorityVerificationCode =
  | "malformed_event"
  | "unsupported_schema"
  | "invalid_payload"
  | "unknown_issuer"
  | "unknown_key"
  | "road_outside_authority_scope"
  | "not_yet_valid"
  | "expired_event"
  | "invalid_signature";

export type AuthorityVerificationResult =
  | {
      ok: true;
      event: SignedAuthorityRoadEvent;
      eventDigest: string;
      authority: { issuer: string; keyId: string; algorithm: typeof AUTHORITY_SIGNATURE_ALGORITHM };
      actionGate: "human_review_required";
      planningEffect: "not_applied";
    }
  | {
      ok: false;
      code: AuthorityVerificationCode;
      message: string;
      actionGate: "blocked";
      planningEffect: "not_applied";
    };

const ENVELOPE_KEYS = ["schemaVersion", "eventId", "issuer", "keyId", "issuedAt", "expiresAt", "sequence", "payload", "signature"];
const PAYLOAD_KEYS = ["roadSegmentId", "state", "weightLimitT", "effectiveFrom", "effectiveUntil", "authorityReference", "reason"];
const TRUST_KEY_KEYS = ["issuer", "keyId", "algorithm", "publicKeyJwk", "allowedRoadSegmentIds"];

function hasOnlyKeys(record: Record<string, unknown>, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isBoundedText(value: unknown, min: number, max: number) {
  return typeof value === "string"
    && value.length >= min
    && value.length <= max
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function isIdentifier(value: unknown, min = 1, max = 128) {
  return isBoundedText(value, min, max) && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value as string);
}

function isBase64Url(value: unknown, min: number, max: number) {
  return isBoundedText(value, min, max) && /^[A-Za-z0-9_-]+$/.test(value as string);
}

function parseUtcTimestamp(value: unknown) {
  if (typeof value !== "string" || value.length > 35 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isHttpsUrl(value: unknown, maxLength = 500) {
  if (!isBoundedText(value, 8, maxLength)) return false;
  try {
    const url = new URL(value as string);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parsePayload(value: unknown): AuthorityRoadEventPayload | null {
  if (!isRecord(value) || !hasOnlyKeys(value, PAYLOAD_KEYS)) return null;
  if (!isIdentifier(value.roadSegmentId, 1, 96)) return null;
  if (!(["open", "closed", "weight_limited"] as unknown[]).includes(value.state)) return null;
  if (!isBoundedText(value.reason, 1, 500) || !isHttpsUrl(value.authorityReference)) return null;
  const effectiveFrom = parseUtcTimestamp(value.effectiveFrom);
  const effectiveUntil = parseUtcTimestamp(value.effectiveUntil);
  if (effectiveFrom === null || effectiveUntil === null || effectiveUntil <= effectiveFrom) return null;
  const state = value.state as AuthorityRoadState;
  if (state === "weight_limited") {
    if (typeof value.weightLimitT !== "number" || !Number.isFinite(value.weightLimitT) || value.weightLimitT <= 0 || value.weightLimitT > 100) return null;
  } else if (value.weightLimitT !== null) {
    return null;
  }
  return {
    roadSegmentId: value.roadSegmentId as string,
    state,
    weightLimitT: value.weightLimitT as number | null,
    effectiveFrom: value.effectiveFrom as string,
    effectiveUntil: value.effectiveUntil as string,
    authorityReference: value.authorityReference as string,
    reason: value.reason as string,
  };
}

export function parseSignedAuthorityRoadEvent(value: unknown):
  | { ok: true; event: SignedAuthorityRoadEvent }
  | { ok: false; code: "malformed_event" | "unsupported_schema" | "invalid_payload"; message: string } {
  if (!isRecord(value) || !hasOnlyKeys(value, ENVELOPE_KEYS)) {
    return { ok: false, code: "malformed_event", message: "The signed event envelope is malformed." };
  }
  if (value.schemaVersion !== AUTHORITY_EVENT_SCHEMA_VERSION) {
    return { ok: false, code: "unsupported_schema", message: `Expected authority event schema ${AUTHORITY_EVENT_SCHEMA_VERSION}.` };
  }
  const payload = parsePayload(value.payload);
  if (!payload) return { ok: false, code: "invalid_payload", message: "The road event payload violates the bounded authority contract." };
  if (!isIdentifier(value.eventId, 8, 128)
    || !isHttpsUrl(value.issuer, 240)
    || !isIdentifier(value.keyId, 1, 120)
    || !isBase64Url(value.signature, 40, 256)
    || !Number.isSafeInteger(value.sequence)
    || (value.sequence as number) < 1
    || (value.sequence as number) > 2_147_483_647) {
    return { ok: false, code: "malformed_event", message: "The event identity, issuer, key, sequence, or signature is invalid." };
  }
  const issuedAt = parseUtcTimestamp(value.issuedAt);
  const expiresAt = parseUtcTimestamp(value.expiresAt);
  const effectiveFrom = Date.parse(payload.effectiveFrom);
  const effectiveUntil = Date.parse(payload.effectiveUntil);
  if (issuedAt === null || expiresAt === null
    || expiresAt <= issuedAt
    || expiresAt - issuedAt > AUTHORITY_EVENT_MAX_LIFETIME_MS
    || effectiveFrom < issuedAt
    || effectiveUntil > expiresAt) {
    return { ok: false, code: "invalid_payload", message: "The authority and effective time windows are inconsistent or too long." };
  }
  return {
    ok: true,
    event: {
      schemaVersion: AUTHORITY_EVENT_SCHEMA_VERSION,
      eventId: value.eventId as string,
      issuer: value.issuer as string,
      keyId: value.keyId as string,
      issuedAt: value.issuedAt as string,
      expiresAt: value.expiresAt as string,
      sequence: value.sequence as number,
      payload,
      signature: value.signature as string,
    },
  };
}

function isPublicP256Jwk(value: unknown): value is JsonWebKey {
  if (!isRecord(value)) return false;
  return value.kty === "EC"
    && value.crv === "P-256"
    && isBoundedText(value.x, 40, 60)
    && isBoundedText(value.y, 40, 60)
    && value.d === undefined
    && (value.use === undefined || value.use === "sig");
}

export function parseAuthorityTrustRegistry(raw: unknown): AuthorityTrustRegistry {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { keys: [] };
    }
  }
  if (!isRecord(value) || !hasOnlyKeys(value, ["keys"]) || !Array.isArray(value.keys) || value.keys.length > 100) return { keys: [] };
  const keys: AuthorityTrustKey[] = [];
  const identities = new Set<string>();
  for (const item of value.keys) {
    if (!isRecord(item)
      || !hasOnlyKeys(item, TRUST_KEY_KEYS)
      || !isHttpsUrl(item.issuer, 240)
      || !isIdentifier(item.keyId, 1, 120)
      || item.algorithm !== AUTHORITY_SIGNATURE_ALGORITHM
      || !isPublicP256Jwk(item.publicKeyJwk)
      || !Array.isArray(item.allowedRoadSegmentIds)
      || item.allowedRoadSegmentIds.length === 0
      || item.allowedRoadSegmentIds.length > 500
      || !item.allowedRoadSegmentIds.every((roadId) => isIdentifier(roadId, 1, 96))) continue;
    const identity = `${item.issuer}\u0000${item.keyId}`;
    if (identities.has(identity)) continue;
    identities.add(identity);
    keys.push({
      issuer: item.issuer as string,
      keyId: item.keyId as string,
      algorithm: AUTHORITY_SIGNATURE_ALGORITHM,
      publicKeyJwk: item.publicKeyJwk,
      allowedRoadSegmentIds: [...new Set(item.allowedRoadSegmentIds as string[])].sort(),
    });
  }
  return { keys };
}

export function authoritySigningPayload(event: SignedAuthorityRoadEvent) {
  return canonicalJson({
    schemaVersion: event.schemaVersion,
    eventId: event.eventId,
    issuer: event.issuer,
    keyId: event.keyId,
    issuedAt: event.issuedAt,
    expiresAt: event.expiresAt,
    sequence: event.sequence,
    payload: event.payload,
  });
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function blocked(code: AuthorityVerificationCode, message: string): AuthorityVerificationResult {
  return { ok: false, code, message, actionGate: "blocked", planningEffect: "not_applied" };
}

export async function verifySignedAuthorityRoadEvent(input: {
  value: unknown;
  registry: AuthorityTrustRegistry;
  supportedRoadSegmentIds: readonly string[];
  now?: Date;
}): Promise<AuthorityVerificationResult> {
  const parsed = parseSignedAuthorityRoadEvent(input.value);
  if (!parsed.ok) return blocked(parsed.code, parsed.message);
  const event = parsed.event;
  const issuerKeys = input.registry.keys.filter((key) => key.issuer === event.issuer);
  if (issuerKeys.length === 0) return blocked("unknown_issuer", "The issuer is not in the pinned authority trust registry.");
  const trustKey = issuerKeys.find((key) => key.keyId === event.keyId);
  if (!trustKey) return blocked("unknown_key", "The key identifier is not trusted for this issuer.");
  if (!input.supportedRoadSegmentIds.includes(event.payload.roadSegmentId)
    || !trustKey.allowedRoadSegmentIds.includes(event.payload.roadSegmentId)) {
    return blocked("road_outside_authority_scope", "The issuing key is not authorized for this road segment.");
  }
  const now = (input.now ?? new Date()).getTime();
  const issuedAt = Date.parse(event.issuedAt);
  const expiresAt = Date.parse(event.expiresAt);
  if (issuedAt > now + AUTHORITY_CLOCK_SKEW_MS) return blocked("not_yet_valid", "The event was issued too far in the future.");
  if (expiresAt <= now) return blocked("expired_event", "The event signature envelope has expired.");
  const signature = decodeBase64Url(event.signature);
  if (!signature || signature.byteLength !== 64) return blocked("invalid_signature", "The signature encoding is invalid.");
  try {
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      trustKey.publicKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      new TextEncoder().encode(authoritySigningPayload(event)),
    );
    if (!valid) return blocked("invalid_signature", "The event signature does not match the pinned authority key.");
  } catch {
    return blocked("invalid_signature", "The authority key or signature could not be verified.");
  }
  return {
    ok: true,
    event,
    eventDigest: `sha256:${await sha256Hex(authoritySigningPayload(event))}`,
    authority: { issuer: event.issuer, keyId: event.keyId, algorithm: AUTHORITY_SIGNATURE_ALGORITHM },
    actionGate: "human_review_required",
    planningEffect: "not_applied",
  };
}
