import assert from "node:assert/strict";
import test from "node:test";
import { buildAssuranceSnapshot } from "../lib/assurance.ts";

test("software controls can never self-assert certification or field readiness", () => {
  const snapshot = buildAssuranceSnapshot({
    authorityRegistryConfigured: true,
    replayStoreReady: true,
    durableLedgerReady: true,
  });
  assert.equal(snapshot.claim.certification, "not_certified");
  assert.equal(snapshot.claim.fieldOperation, "blocked");
  assert.equal(snapshot.claim.autonomousAuthority, "prohibited");
  assert.equal(snapshot.blockingGates.every((gate) => gate.satisfied === false), true);
  assert.ok(snapshot.summary.blockingGatesOpen >= 7);
});

test("runtime dependency gaps remain visible and do not inflate control evidence", () => {
  const snapshot = buildAssuranceSnapshot({
    authorityRegistryConfigured: false,
    replayStoreReady: false,
    durableLedgerReady: false,
  });
  assert.equal(snapshot.runtime.authorityRegistryConfigured, false);
  assert.equal(snapshot.controls.find((control) => control.id === "AUTH-01")?.runtime, "configuration_required");
  assert.equal(snapshot.controls.find((control) => control.id === "AUTH-02")?.runtime, "migration_or_binding_required");
  assert.equal(snapshot.summary.implementedControls, 7);
});
