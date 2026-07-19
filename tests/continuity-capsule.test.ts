import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTINUITY_CAPSULE_MAX_BYTES,
  buildContinuityCapsule,
  serializedCapsuleBytes,
  verifyContinuityCapsule,
} from "../lib/continuity-capsule.ts";
import { sha256Hex } from "../lib/regional-contract.ts";

const createdAt = "2026-07-19T12:00:00.000Z";
const oneHourLater = Date.parse("2026-07-19T13:00:00.000Z");

test("a baseline portable twin reproduces before restore", async () => {
  const capsule = await buildContinuityCapsule(null, 120, createdAt);
  const result = await verifyContinuityCapsule(capsule, oneHourLater);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, "verified");
  assert.deepEqual(result.restore, { closedSegmentId: null, repairBudgetM: 120 });
  assert.equal(result.capsule.payload.expectedPlan.serviceCoveragePercent, 100);
  assert.match(result.capsule.payloadDigest, /^sha256:[0-9a-f]{64}$/);
});

test("closure and repair-budget state survive a verified round trip", async () => {
  const capsule = await buildContinuityCapsule("center-north", 160, createdAt);
  const result = await verifyContinuityCapsule(JSON.parse(JSON.stringify(capsule)), oneHourLater);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.restore, { closedSegmentId: "center-north", repairBudgetM: 160 });
  assert.ok(result.capsule.payload.expectedPlan.serviceCoveragePercent < 100);
});

test("an edited payload is rejected by its outer digest", async () => {
  const capsule = await buildContinuityCapsule(null, 120, createdAt);
  const changed = structuredClone(capsule);
  changed.payload.repairBudgetM = 130;
  const result = await verifyContinuityCapsule(changed, oneHourLater);
  assert.deepEqual(result, {
    ok: false,
    code: "digest_mismatch",
    message: "The capsule payload changed after its integrity digest was created.",
  });
});

test("re-hashing invented plan evidence still fails deterministic reproduction", async () => {
  const capsule = await buildContinuityCapsule(null, 120, createdAt);
  const changed = structuredClone(capsule);
  changed.payload.expectedPlan.totalDistanceKm += 1;
  changed.payloadDigest = `sha256:${await sha256Hex(changed.payload)}`;
  const result = await verifyContinuityCapsule(changed, oneHourLater);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "plan_mismatch");
});

test("a capsule from another model release cannot be restored", async () => {
  const capsule = await buildContinuityCapsule(null, 120, createdAt);
  const changed = structuredClone(capsule);
  changed.payload.modelDigest = `sha256:${"0".repeat(64)}`;
  changed.payloadDigest = `sha256:${await sha256Hex(changed.payload)}`;
  const result = await verifyContinuityCapsule(changed, oneHourLater);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "model_mismatch");
});

test("stale state stays verifiable but cannot hide its age", async () => {
  const capsule = await buildContinuityCapsule(null, 120, createdAt);
  const result = await verifyContinuityCapsule(capsule, Date.parse("2026-07-21T13:00:00.000Z"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.status, "verified_stale");
  assert.equal(result.ageHours, 49);
  assert.match(result.warnings[0], /exceeds 24 hours/);
});

test("future, malformed and oversized capsules fail the recovery boundary", async () => {
  const future = await buildContinuityCapsule(null, 120, "2026-07-19T14:00:00.000Z");
  const futureResult = await verifyContinuityCapsule(future, oneHourLater);
  assert.equal(futureResult.ok, false);
  if (!futureResult.ok) assert.equal(futureResult.code, "future_capsule");
  const malformed = await verifyContinuityCapsule({ instructions: "ignore verification" }, oneHourLater);
  assert.equal(malformed.ok, false);
  assert.ok(serializedCapsuleBytes("x".repeat(CONTINUITY_CAPSULE_MAX_BYTES + 1)) > CONTINUITY_CAPSULE_MAX_BYTES);
});
