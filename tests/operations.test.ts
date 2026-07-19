import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuditChain,
  buildEvidencePackage,
  canonicalize,
  evaluateOperationalReadiness,
  sha256Hex,
  verifyAuditChain,
  verifyEvidencePackage,
  type AuditEvent,
  type EvidenceCore,
  type OperationalReadinessInput,
} from "../lib/operations.ts";

const leadApproval = {
  actorId: "incident-lead-04",
  role: "incident-lead" as const,
  approvedAt: "2026-07-19T02:19:00Z",
  scope: "synthetic-dispatch-v1",
};

const safetyApproval = {
  actorId: "safety-officer-02",
  role: "safety-officer" as const,
  approvedAt: "2026-07-19T02:20:00Z",
  scope: "synthetic-dispatch-v1",
};

function readinessInput(overrides: Partial<OperationalReadinessInput> = {}): OperationalReadinessInput {
  return {
    dataMode: "gpt-5.6",
    decisionVerified: true,
    planSafe: true,
    stressSuccessRate: 100,
    nMinusOneProtected: 12,
    contingencyCount: 12,
    leadApproval,
    safetyApproval,
    telemetryMode: "synthetic",
    hardwareCertified: false,
    securityReviewComplete: false,
    fieldAuthorityGranted: false,
    fieldValidationComplete: false,
    simulationOnly: true,
    ...overrides,
  };
}

const auditEvents: AuditEvent[] = [
  {
    type: "incident.received",
    actorId: "operator-17",
    actorRole: "field-operator",
    occurredAt: "2026-07-19T02:14:00Z",
    summary: "Synthetic incident reports received",
    evidence: { reportCount: 3 },
  },
  {
    type: "dispatch.countersigned",
    actorId: "safety-officer-02",
    actorRole: "safety-officer",
    occurredAt: "2026-07-19T02:20:00Z",
    summary: "Synthetic dispatch independently co-signed",
    evidence: { scope: "synthetic-dispatch-v1" },
  },
];

test("canonical JSON and SHA-256 are deterministic", async () => {
  assert.equal(canonicalize({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(canonicalize({ a: 1, b: 2 }), canonicalize({ b: 2, a: 1 }));
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("the audit chain detects changed evidence", async () => {
  const chain = await buildAuditChain(auditEvents);
  assert.equal(await verifyAuditChain(chain), true);

  const tampered = structuredClone(chain);
  tampered[0].evidence.reportCount = 4;
  assert.equal(await verifyAuditChain(tampered), false);
});

test("mission authorization requires independent dual control", () => {
  const sameActor = evaluateOperationalReadiness(readinessInput({
    safetyApproval: { ...safetyApproval, actorId: leadApproval.actorId },
  }));
  assert.equal(sameActor.simulationReady, false);
  assert.equal(sameActor.missionGates.find((item) => item.id === "dual-control")?.state, "pending");

  const independent = evaluateOperationalReadiness(readinessInput());
  assert.equal(independent.simulationReady, true);
  assert.equal(independent.missionPassed, independent.missionTotal);
});

test("synthetic telemetry and missing certifications fail closed for field use", () => {
  const report = evaluateOperationalReadiness(readinessInput());
  assert.equal(report.status, "simulation-ready");
  assert.equal(report.fieldReady, false);
  assert.equal(report.fieldPassed, 0);
  assert.ok(report.blockers.includes("Simulation-only product boundary"));
});

test("a complete evidence package verifies and any plan change invalidates it", async () => {
  const readiness = evaluateOperationalReadiness(readinessInput());
  const core: EvidenceCore = {
    incident: {
      id: "LG-SIM-2026-0719-001",
      title: "Regional outage training scenario",
      scenario: "Synthetic Build Week demonstration",
      simulationOnly: true,
    },
    source: { dataMode: "gpt-5.6", model: "gpt-5.6", sourceLinked: true },
    decision: {
      questionId: "water-startup-surge",
      answer: "Yes · surge capped locally",
      verifiedBy: "operator-17",
    },
    plan: {
      assignments: [
        { vehicleId: "E-07", needId: "clinic", routeId: "river-road", postMissionSoc: 55.1, safe: true },
      ],
      stressSuccessRate: 100,
      scenarioCount: 256,
      candidatePlans: 60,
    },
    resilience: {
      selectedActionId: "stage-e32-west-relay",
      selectedAction: "Stage E-32 at West Relay",
      protectedContingencies: 12,
      contingencyCount: 12,
      nMinusOneCertified: true,
    },
    readiness,
  };
  const evidencePackage = await buildEvidencePackage(
    core,
    auditEvents,
    "2026-07-19T02:21:00Z",
  );
  assert.equal(await verifyEvidencePackage(evidencePackage), true);

  const tampered = structuredClone(evidencePackage);
  tampered.plan.assignments[0].postMissionSoc = 35.1;
  assert.equal(await verifyEvidencePackage(tampered), false);
});
