import { AUTHORITY_EVENT_SCHEMA_VERSION, AUTHORITY_SIGNATURE_ALGORITHM } from "./authority-event.ts";
import { REGIONAL_ENGINE_VERSION, REGIONAL_PLAN_SCHEMA_VERSION } from "./regional-contract.ts";

export type AssuranceControlStatus = "implemented" | "partial" | "externally_blocked";

export interface AssuranceRuntimeState {
  authorityRegistryConfigured: boolean;
  replayStoreReady: boolean;
  durableLedgerReady: boolean;
}

export function buildAssuranceSnapshot(runtime: AssuranceRuntimeState) {
  const controls = [
    {
      id: "AUTH-01",
      title: "Pinned public-key authority verification",
      status: "implemented" as AssuranceControlStatus,
      runtime: runtime.authorityRegistryConfigured ? "configured" : "configuration_required",
      evidence: ["lib/authority-event.ts", "tests/authority-event.test.ts"],
      frameworkRefs: ["ISO/IEC 27001:2022", "NIST SSDF SP 800-218", "OWASP ASVS 5.0"],
    },
    {
      id: "AUTH-02",
      title: "Atomic event replay and stale-sequence rejection",
      status: "implemented" as AssuranceControlStatus,
      runtime: runtime.replayStoreReady ? "ready" : "migration_or_binding_required",
      evidence: ["app/api/authority-events/verify/route.ts", "db/schema.ts"],
      frameworkRefs: ["ISO/IEC 27001:2022", "OWASP ASVS 5.0"],
    },
    {
      id: "AI-01",
      title: "AI output cannot become road or dispatch authority",
      status: "implemented" as AssuranceControlStatus,
      runtime: "enforced",
      evidence: ["lib/regional-reasoning.ts", "lib/authority-event.ts"],
      frameworkRefs: ["ISO/IEC 42001:2023", "ISO/IEC 23894:2023", "METI AI Guidelines v1.2"],
    },
    {
      id: "AI-02",
      title: "Schema-bound model output with deterministic adjudication",
      status: "implemented" as AssuranceControlStatus,
      runtime: "enforced",
      evidence: ["app/api/regional-reasoning/route.ts", "tests/regional-reasoning.test.ts"],
      frameworkRefs: ["ISO/IEC 42001:2023", "OWASP LLM Verification Standard 2.0"],
    },
    {
      id: "GOV-01",
      title: "Identity-scoped decision ledger and independent review",
      status: "implemented" as AssuranceControlStatus,
      runtime: runtime.durableLedgerReady ? "ready" : "migration_or_binding_required",
      evidence: ["app/api/regional-runs/route.ts", "lib/regional-ledger.ts"],
      frameworkRefs: ["ISO/IEC 27001:2022", "ISO/IEC 42001:2023"],
    },
    {
      id: "DATA-01",
      title: "Fail-closed provenance, freshness, scope and conflict gateway",
      status: "implemented" as AssuranceControlStatus,
      runtime: "enforced",
      evidence: ["lib/data-trust.ts", "tests/data-trust.test.ts"],
      frameworkRefs: ["ISO/IEC 27001:2022", "ISO/IEC 42001:2023", "NIST AI RMF 1.0"],
    },
    {
      id: "DATA-02",
      title: "Bounded local GeoJSON topology validation and evidence",
      status: "implemented" as AssuranceControlStatus,
      runtime: "enforced",
      evidence: ["lib/pilot-data-sandbox.ts", "tests/pilot-data-sandbox.test.ts", "PILOT_DATA_SANDBOX.md"],
      frameworkRefs: ["ISO/IEC 27001:2022", "ISO/IEC 42001:2023", "NIST AI RMF 1.0"],
    },
    {
      id: "BC-02",
      title: "Portable twin state with deterministic restore verification",
      status: "implemented" as AssuranceControlStatus,
      runtime: "enforced",
      evidence: ["lib/continuity-capsule.ts", "tests/continuity-capsule.test.ts", "RECOVERY.md"],
      frameworkRefs: ["ISO 22301:2019", "ISO/IEC 27001:2022"],
    },
    {
      id: "BC-01",
      title: "Tested recovery objectives and disaster-recovery exercise",
      status: "externally_blocked" as AssuranceControlStatus,
      runtime: "not_attested",
      evidence: ["RUNBOOK.md", "CERTIFICATION_ROADMAP.md"],
      frameworkRefs: ["ISO 22301:2019"],
    },
  ];

  const blockingGates = [
    { id: "authority-pki", title: "Road authority keys registered under a signed key-ceremony record", satisfied: false, owner: "Road authority + security" },
    { id: "tenant-isolation", title: "Independent tenant-isolation and authorization test", satisfied: false, owner: "Security assessor" },
    { id: "penetration-test", title: "Independent penetration test with critical findings closed", satisfied: false, owner: "Accredited test provider" },
    { id: "dr-exercise", title: "Observed backup restore and disaster-recovery exercise", satisfied: false, owner: "Operations + auditor" },
    { id: "shadow-pilot", title: "Supervised regional shadow pilot with calibrated safety metrics", satisfied: false, owner: "Municipality + operators" },
    { id: "live-adapters", title: "Authoritative live-data adapters validated under outage and conflict", satisfied: false, owner: "Data owners + independent assessor" },
    { id: "certification-audit", title: "Independent management-system certification audit", satisfied: false, owner: "Certification body" },
  ];

  return {
    generatedAt: new Date().toISOString(),
    release: {
      engineVersion: REGIONAL_ENGINE_VERSION,
      planSchemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
      authoritySchemaVersion: AUTHORITY_EVENT_SCHEMA_VERSION,
      signatureAlgorithm: AUTHORITY_SIGNATURE_ALGORITHM,
    },
    claim: {
      certification: "not_certified" as const,
      fieldOperation: "blocked" as const,
      autonomousAuthority: "prohibited" as const,
      statement: "Software evidence is not certification. Independent assessment, operating evidence, and authorized field validation remain mandatory.",
    },
    runtime,
    controls,
    blockingGates,
    summary: {
      implementedControls: controls.filter((control) => control.status === "implemented").length,
      totalControls: controls.length,
      blockingGatesOpen: blockingGates.filter((gate) => !gate.satisfied).length,
    },
  };
}

export type AssuranceSnapshot = ReturnType<typeof buildAssuranceSnapshot>;
