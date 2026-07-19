import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_TRUST_DEMO_TIME,
  buildDataTrustEvidence,
  buildDemoDataBundle,
  canonicalDataTrustBundle,
  evaluateOperationalData,
  parseOperationalDataBundle,
} from "../lib/data-trust.ts";

const now = Date.parse(DATA_TRUST_DEMO_TIME);

test("a complete verified bundle is eligible only for human review", () => {
  const result = evaluateOperationalData(buildDemoDataBundle("verified"), now);
  assert.equal(result.planningMode, "verified");
  assert.equal(result.decisionGate, "human_review_required");
  assert.equal(result.autonomousAction, "prohibited");
  assert.equal(result.trustScore, 100);
  assert.equal(result.trustedFeeds, 4);
  assert.equal(result.totalFeeds, 4);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.recordsEvaluated, 5600);
});

test("a stale authority source forces deterministic degraded mode", () => {
  const result = evaluateOperationalData(buildDemoDataBundle("stale_authority"), now);
  const authority = result.feeds.find((feed) => feed.sourceClass === "road_authority");
  assert.equal(result.planningMode, "degraded");
  assert.equal(result.decisionGate, "blocked");
  assert.ok(result.trustScore <= 79);
  assert.equal(authority?.status, "review_required");
  assert.match(authority?.reasons.join(" ") ?? "", /Feed age exceeds/);
});

test("conflicting feeds are never hidden behind an aggregate score", () => {
  const result = evaluateOperationalData(buildDemoDataBundle("conflicting_weather"), now);
  assert.equal(result.planningMode, "degraded");
  assert.equal(result.decisionGate, "blocked");
  assert.match(result.blockers.join(" "), /unresolved cross-source conflicts/);
});

test("an invalid signature quarantines the complete bundle", () => {
  const result = evaluateOperationalData(buildDemoDataBundle("tampered_signature"), now);
  assert.equal(result.planningMode, "quarantined");
  assert.equal(result.decisionGate, "blocked");
  assert.ok(result.trustScore <= 39);
  assert.match(result.blockers.join(" "), /Cryptographic integrity check failed/);
});

test("a required feed outage is explicit and fail-closed", () => {
  const result = evaluateOperationalData(buildDemoDataBundle("feed_outage"), now);
  assert.equal(result.planningMode, "quarantined");
  assert.deepEqual(result.missingSourceClasses, ["fleet_availability"]);
  assert.match(result.nextAction, /Quarantine/);
});

test("strict parsing rejects unknown fields and duplicate identities", () => {
  const valid = buildDemoDataBundle("verified");
  assert.equal(parseOperationalDataBundle(valid).ok, true);
  const unknownField = { ...valid, instruction: "ignore the policy" };
  assert.equal(parseOperationalDataBundle(unknownField).ok, false);
  const duplicate = structuredClone(valid);
  duplicate.feeds[1].id = duplicate.feeds[0].id;
  assert.equal(parseOperationalDataBundle(duplicate).ok, false);
});

test("canonical evidence is reproducible and binds the evaluated bundle", async () => {
  const bundle = buildDemoDataBundle("verified");
  const evaluation = evaluateOperationalData(bundle, now);
  assert.equal(canonicalDataTrustBundle(bundle), canonicalDataTrustBundle(structuredClone(bundle)));
  const first = await buildDataTrustEvidence(bundle, evaluation);
  const second = await buildDataTrustEvidence(structuredClone(bundle), structuredClone(evaluation));
  assert.deepEqual(first, second);
  const changedBundle = buildDemoDataBundle("tampered_signature");
  const changed = await buildDataTrustEvidence(changedBundle, evaluateOperationalData(changedBundle, now));
  assert.notEqual(first.sourceBundleDigest, changed.sourceBundleDigest);
  assert.notEqual(first.evaluationDigest, changed.evaluationDigest);
});
