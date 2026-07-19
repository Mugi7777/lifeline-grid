export type DataMode = "ready" | "gpt-5.6" | "demo-fallback";
export type GateState = "pass" | "pending" | "blocked";
export type ReadinessStatus = "blocked" | "simulation-ready" | "field-ready";

export interface ApprovalRecord {
  actorId: string;
  role: "incident-lead" | "safety-officer";
  approvedAt: string;
  scope: string;
}

export interface ReadinessGate {
  id: string;
  label: string;
  detail: string;
  state: GateState;
  owner: string;
}

export interface OperationalReadinessInput {
  dataMode: DataMode;
  decisionVerified: boolean;
  planSafe: boolean;
  stressSuccessRate: number;
  nMinusOneProtected: number;
  contingencyCount: number;
  leadApproval?: ApprovalRecord;
  safetyApproval?: ApprovalRecord;
  telemetryMode: "synthetic" | "validated-live";
  hardwareCertified: boolean;
  securityReviewComplete: boolean;
  fieldAuthorityGranted: boolean;
  fieldValidationComplete: boolean;
  simulationOnly: boolean;
}

export interface OperationalReadinessReport {
  status: ReadinessStatus;
  simulationReady: boolean;
  fieldReady: boolean;
  missionPassed: number;
  missionTotal: number;
  fieldPassed: number;
  fieldTotal: number;
  missionGates: ReadinessGate[];
  fieldGates: ReadinessGate[];
  blockers: string[];
}

export interface AuditEvent {
  type: string;
  actorId: string;
  actorRole: string;
  occurredAt: string;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface AuditEntry extends AuditEvent {
  sequence: number;
  previousHash: string;
  hash: string;
}

export interface EvidenceCore {
  incident: {
    id: string;
    title: string;
    scenario: string;
    simulationOnly: boolean;
  };
  source: {
    dataMode: DataMode;
    model: string;
    sourceLinked: boolean;
  };
  decision: {
    questionId: string;
    answer: string;
    verifiedBy: string;
  };
  plan: {
    assignments: Array<{
      vehicleId: string;
      needId: string;
      routeId: string;
      postMissionSoc: number;
      safe: boolean;
    }>;
    stressSuccessRate: number;
    scenarioCount: number;
    candidatePlans: number;
  };
  resilience: {
    selectedActionId: string;
    selectedAction: string;
    protectedContingencies: number;
    contingencyCount: number;
    nMinusOneCertified: boolean;
  };
  readiness: OperationalReadinessReport;
}

export interface EvidencePackage extends EvidenceCore {
  schemaVersion: "lifeline-grid.evidence.v1";
  generatedAt: string;
  integrityAlgorithm: "SHA-256 over canonical JSON";
  auditChain: AuditEntry[];
  auditRootHash: string;
  packageHash: string;
}

const ZERO_HASH = "0".repeat(64);

function gate(
  id: string,
  label: string,
  detail: string,
  owner: string,
  state: GateState,
): ReadinessGate {
  return { id, label, detail, owner, state };
}

export function evaluateOperationalReadiness(
  input: OperationalReadinessInput,
): OperationalReadinessReport {
  const sourceReady = input.dataMode !== "ready";
  const nMinusOneReady = input.contingencyCount > 0
    && input.nMinusOneProtected === input.contingencyCount;
  const leadApproved = Boolean(input.leadApproval);
  const dualControl = Boolean(
    input.leadApproval
    && input.safetyApproval
    && input.leadApproval.actorId !== input.safetyApproval.actorId
    && input.leadApproval.role !== input.safetyApproval.role,
  );

  const missionGates: ReadinessGate[] = [
    gate(
      "source-provenance",
      "Source provenance",
      input.dataMode === "gpt-5.6"
        ? "GPT-5.6 output is source-linked"
        : input.dataMode === "demo-fallback"
          ? "Synthetic fallback provenance is explicit"
          : "No structured source record exists",
      "Data operator",
      sourceReady ? "pass" : "pending",
    ),
    gate(
      "verified-fact",
      "Decision-critical fact",
      input.decisionVerified ? "Operator answer recorded" : "A consequential assumption is unresolved",
      "Field operator",
      input.decisionVerified ? "pass" : "pending",
    ),
    gate(
      "physical-proof",
      "Physical feasibility",
      input.planSafe ? "Every hard constraint passes" : "One or more hard constraints fail",
      "Optimization service",
      input.planSafe ? "pass" : "blocked",
    ),
    gate(
      "uncertainty-proof",
      "Bounded uncertainty",
      `${input.stressSuccessRate.toFixed(1)}% stress-scenario success`,
      "Optimization service",
      input.stressSuccessRate === 100 ? "pass" : "blocked",
    ),
    gate(
      "n-minus-one",
      "N-1 resilience",
      `${input.nMinusOneProtected}/${input.contingencyCount} modeled single failures protected`,
      "Safety engineer",
      nMinusOneReady ? "pass" : input.contingencyCount > 0 ? "blocked" : "pending",
    ),
    gate(
      "lead-approval",
      "Incident Lead approval",
      leadApproved ? `${input.leadApproval!.actorId} approved the simulation scope` : "Lead approval is required",
      "Incident Lead",
      leadApproved ? "pass" : "pending",
    ),
    gate(
      "dual-control",
      "Independent co-sign",
      dualControl ? `${input.safetyApproval!.actorId} independently co-signed` : "A distinct Safety Officer must co-sign",
      "Safety Officer",
      dualControl ? "pass" : "pending",
    ),
  ];

  const fieldGates: ReadinessGate[] = [
    gate(
      "validated-telemetry",
      "Validated live telemetry",
      input.telemetryMode === "validated-live" ? "Certified live telemetry is available" : "Only synthetic telemetry is connected",
      "Integration owner",
      input.telemetryMode === "validated-live" ? "pass" : "blocked",
    ),
    gate(
      "certified-hardware",
      "Certified electrical interface",
      input.hardwareCertified ? "Equipment certification evidence is attached" : "Electrical and vehicle interfaces are not certified",
      "Electrical safety owner",
      input.hardwareCertified ? "pass" : "blocked",
    ),
    gate(
      "security-review",
      "Cybersecurity assurance",
      input.securityReviewComplete ? "Independent security review is complete" : "Threat review, penetration test, and key management are incomplete",
      "Security owner",
      input.securityReviewComplete ? "pass" : "blocked",
    ),
    gate(
      "field-authority",
      "Emergency authority",
      input.fieldAuthorityGranted ? "Local operational authority is recorded" : "No emergency-management authority has approved use",
      "Public authority",
      input.fieldAuthorityGranted ? "pass" : "blocked",
    ),
    gate(
      "field-validation",
      "Supervised field validation",
      input.fieldValidationComplete ? "Independent field acceptance evidence is attached" : "No supervised field trial or acceptance test exists",
      "Pilot owner",
      input.fieldValidationComplete ? "pass" : "blocked",
    ),
  ];

  const missionPassed = missionGates.filter((item) => item.state === "pass").length;
  const fieldPassed = fieldGates.filter((item) => item.state === "pass").length;
  const simulationReady = missionPassed === missionGates.length;
  const fieldReady = simulationReady
    && fieldPassed === fieldGates.length
    && !input.simulationOnly;
  const status: ReadinessStatus = fieldReady
    ? "field-ready"
    : simulationReady
      ? "simulation-ready"
      : "blocked";

  return {
    status,
    simulationReady,
    fieldReady,
    missionPassed,
    missionTotal: missionGates.length,
    fieldPassed,
    fieldTotal: fieldGates.length,
    missionGates,
    fieldGates,
    blockers: [
      ...missionGates.filter((item) => item.state !== "pass").map((item) => item.label),
      ...fieldGates.filter((item) => item.state !== "pass").map((item) => item.label),
      ...(input.simulationOnly ? ["Simulation-only product boundary"] : []),
    ],
  };
}

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite numbers cannot be canonicalized");
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical value: ${typeof value}`);
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildAuditChain(events: AuditEvent[]): Promise<AuditEntry[]> {
  const chain: AuditEntry[] = [];
  let previousHash = ZERO_HASH;

  for (const [index, event] of events.entries()) {
    const sequence = index + 1;
    const hash = await sha256Hex(canonicalize({ sequence, previousHash, ...event }));
    chain.push({ ...event, sequence, previousHash, hash });
    previousHash = hash;
  }

  return chain;
}

export async function verifyAuditChain(chain: AuditEntry[]): Promise<boolean> {
  let previousHash = ZERO_HASH;
  for (const [index, entry] of chain.entries()) {
    if (entry.sequence !== index + 1 || entry.previousHash !== previousHash) return false;
    const { hash, ...payload } = entry;
    const expected = await sha256Hex(canonicalize(payload));
    if (hash !== expected) return false;
    previousHash = hash;
  }
  return true;
}

export async function buildEvidencePackage(
  core: EvidenceCore,
  events: AuditEvent[],
  generatedAt: string,
): Promise<EvidencePackage> {
  const auditChain = await buildAuditChain(events);
  const withoutPackageHash = {
    schemaVersion: "lifeline-grid.evidence.v1" as const,
    generatedAt,
    integrityAlgorithm: "SHA-256 over canonical JSON" as const,
    ...core,
    auditChain,
    auditRootHash: auditChain.at(-1)?.hash ?? ZERO_HASH,
  };
  const packageHash = await sha256Hex(canonicalize(withoutPackageHash));
  return { ...withoutPackageHash, packageHash };
}

export async function verifyEvidencePackage(
  evidencePackage: EvidencePackage,
): Promise<boolean> {
  const { packageHash, ...withoutPackageHash } = evidencePackage;
  if (!(await verifyAuditChain(evidencePackage.auditChain))) return false;
  if (evidencePackage.auditRootHash !== (evidencePackage.auditChain.at(-1)?.hash ?? ZERO_HASH)) return false;
  return packageHash === await sha256Hex(canonicalize(withoutPackageHash));
}
