import {
  DEFAULT_NEEDS,
  VEHICLES,
  applyDecisionAnswer,
  buildDecisionAnalysis,
  buildGreedyBaseline,
  buildVerifiedPlan,
  type DispatchPlan,
} from "./planner.ts";
import { sha256Hex, canonicalize } from "./operations.ts";

export const EMERGENCY_REASONING_SCHEMA_VERSION = "2026-07-20.1" as const;
export const EMERGENCY_HYPOTHESIS_IDS = ["h1", "h2", "h3"] as const;
export const EMERGENCY_ROUTE_IDS = [
  "river-road",
  "clinic-cut",
  "north-link",
  "east-bridge",
  "ridge-bypass",
  "west-relay",
  "charge-link",
] as const;

export type EmergencyHypothesisId = typeof EMERGENCY_HYPOTHESIS_IDS[number];
export type EmergencyEvidenceKey = `route:${typeof EMERGENCY_ROUTE_IDS[number]}` | `vehicle:${string}` | "need:water:peak";

export interface EmergencyPowerHypothesis {
  id: EmergencyHypothesisId;
  title: string;
  interpretation: string;
  blockedRouteIds: string[];
  unavailableVehicleIds: string[];
  waterPeakMode: "confirmed" | "adverse";
  evidenceFor: string[];
  evidenceAgainst: string[];
  assumptions: string[];
  confidence: number;
}

export interface EmergencyEvidenceQuestion {
  id: `q${1 | 2 | 3}`;
  question: string;
  evidenceKey: EmergencyEvidenceKey;
  evidenceToRequest: string;
  whyItMatters: string;
}

export interface EmergencyReasoningProposal {
  schemaVersion: typeof EMERGENCY_REASONING_SCHEMA_VERSION;
  situationSummary: string;
  authoritySignal: string;
  hypotheses: [EmergencyPowerHypothesis, EmergencyPowerHypothesis, EmergencyPowerHypothesis];
  evidenceQuestions: EmergencyEvidenceQuestion[];
  recommendedHypothesisId: EmergencyHypothesisId;
  uncertainty: string;
  decisionLimit: string;
}

export interface EmergencyWorldEvaluation {
  hypothesisId: EmergencyHypothesisId;
  title: string;
  plan: DispatchPlan;
  greedyPlan: DispatchPlan;
  metrics: {
    criticalSiteHours: number;
    unservedCriticalKwh: number;
    fullMissionSuccessRate: number;
    criticalSuccessRate: number;
    safeAssignments: number;
    assignmentChanges: number;
  };
  algorithmEvidence: {
    candidatePlans: number;
    stressScenarios: number;
    planScenarioEvaluations: number;
    greedyViolationScenarios: number;
    exactOptimalityCertified: boolean;
  };
}

export interface RankedEmergencyEvidenceQuestion extends EmergencyEvidenceQuestion {
  rank: number;
  valueScore: number;
  criticalEnergySwingKwh: number;
  criticalCoverageSwingHours: number;
  fullMissionSuccessSwingPoints: number;
  safeAssignmentSwing: number;
}

export interface EmergencyReasoningAdjudication {
  evaluations: EmergencyWorldEvaluation[];
  rankedEvidenceQuestions: RankedEmergencyEvidenceQuestion[];
  highestValueQuestion: RankedEmergencyEvidenceQuestion;
  modelRecommendationStatus: "withheld_pending_evidence";
  modelRecommendedHypothesisId: EmergencyHypothesisId;
  actionGate: "human_authority_required";
  computationalEvidence: {
    worldsReplanned: 3;
    exactAssignmentCandidates: number;
    stressScenarios: number;
    planScenarioEvaluations: number;
  };
  advisoryConclusion: string;
}

const MAX_TEXT = 420;
const MAX_LIST = 4;
const vehicleIds = new Set(VEHICLES.map((vehicle) => vehicle.id));
const routeIds = new Set<string>(EMERGENCY_ROUTE_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key)) && keys.every((key) => key in value);
}

function boundedText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT;
}

function boundedTextList(value: unknown) {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= MAX_LIST
    && value.every(boundedText);
}

function validHypothesis(value: unknown, expectedId: EmergencyHypothesisId): value is EmergencyPowerHypothesis {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "id", "title", "interpretation", "blockedRouteIds", "unavailableVehicleIds", "waterPeakMode",
    "evidenceFor", "evidenceAgainst", "assumptions", "confidence",
  ])) return false;
  if (value.id !== expectedId || !boundedText(value.title) || !boundedText(value.interpretation)) return false;
  if (!Array.isArray(value.blockedRouteIds) || value.blockedRouteIds.length > 3 || !value.blockedRouteIds.every((id) => typeof id === "string" && routeIds.has(id))) return false;
  if (!Array.isArray(value.unavailableVehicleIds) || value.unavailableVehicleIds.length > 2 || !value.unavailableVehicleIds.every((id) => typeof id === "string" && vehicleIds.has(id))) return false;
  if (new Set(value.blockedRouteIds).size !== value.blockedRouteIds.length || new Set(value.unavailableVehicleIds).size !== value.unavailableVehicleIds.length) return false;
  if (value.waterPeakMode !== "confirmed" && value.waterPeakMode !== "adverse") return false;
  return boundedTextList(value.evidenceFor)
    && boundedTextList(value.evidenceAgainst)
    && boundedTextList(value.assumptions)
    && typeof value.confidence === "number"
    && Number.isFinite(value.confidence)
    && value.confidence >= 0
    && value.confidence <= 1;
}

function validEvidenceKey(value: unknown): value is EmergencyEvidenceKey {
  if (value === "need:water:peak") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("route:")) return routeIds.has(value.slice("route:".length));
  if (value.startsWith("vehicle:")) return vehicleIds.has(value.slice("vehicle:".length));
  return false;
}

function validQuestion(value: unknown, index: number): value is EmergencyEvidenceQuestion {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "question", "evidenceKey", "evidenceToRequest", "whyItMatters"])) return false;
  return value.id === `q${index + 1}`
    && boundedText(value.question)
    && validEvidenceKey(value.evidenceKey)
    && boundedText(value.evidenceToRequest)
    && boundedText(value.whyItMatters);
}

export function validateEmergencyReasoningProposal(value: unknown): value is EmergencyReasoningProposal {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "schemaVersion", "situationSummary", "authoritySignal", "hypotheses", "evidenceQuestions",
    "recommendedHypothesisId", "uncertainty", "decisionLimit",
  ])) return false;
  if (value.schemaVersion !== EMERGENCY_REASONING_SCHEMA_VERSION
    || !boundedText(value.situationSummary)
    || !boundedText(value.authoritySignal)
    || !boundedText(value.uncertainty)
    || !boundedText(value.decisionLimit)
    || !EMERGENCY_HYPOTHESIS_IDS.includes(value.recommendedHypothesisId as EmergencyHypothesisId)
    || !Array.isArray(value.hypotheses)
    || value.hypotheses.length !== 3
    || !value.hypotheses.every((item, index) => validHypothesis(item, EMERGENCY_HYPOTHESIS_IDS[index]))) return false;
  const fingerprints = value.hypotheses.map((item) => JSON.stringify({
    blocked: [...item.blockedRouteIds].sort(),
    unavailable: [...item.unavailableVehicleIds].sort(),
    peak: item.waterPeakMode,
  }));
  if (new Set(fingerprints).size !== 3) return false;
  if (!Array.isArray(value.evidenceQuestions)
    || value.evidenceQuestions.length < 1
    || value.evidenceQuestions.length > 3
    || !value.evidenceQuestions.every(validQuestion)) return false;
  return new Set(value.evidenceQuestions.map((item) => item.evidenceKey)).size === value.evidenceQuestions.length;
}

export function buildFallbackEmergencyReasoningProposal(): EmergencyReasoningProposal {
  return {
    schemaVersion: EMERGENCY_REASONING_SCHEMA_VERSION,
    situationSummary: "Conflicting synthetic reports leave the water-station start-up peak, East Bridge access and the high-output E-44 vehicle uncertain.",
    authoritySignal: "No single field message authenticates the electrical peak, route state or vehicle availability. Each remains a separate fact for an authorized operator to verify.",
    hypotheses: [
      {
        id: "h1",
        title: "Nominal corridor and high-output reserve",
        interpretation: "East Bridge remains open, E-44 is available and the water station absorbs its start-up surge locally.",
        blockedRouteIds: [],
        unavailableVehicleIds: [],
        waterPeakMode: "confirmed",
        evidenceFor: ["A local operator reports the bridge approach is passable.", "The fleet board last showed E-44 available."],
        evidenceAgainst: ["Neither observation is authenticated for the complete mission window."],
        assumptions: ["The on-site starter caps the water load at 4.2 kW.", "No later road restriction supersedes the field report."],
        confidence: 0.42,
      },
      {
        id: "h2",
        title: "Bridge closed, alternate power route usable",
        interpretation: "East Bridge is closed, but E-44 remains available and the water station keeps the local surge cap.",
        blockedRouteIds: ["east-bridge"],
        unavailableVehicleIds: [],
        waterPeakMode: "confirmed",
        evidenceFor: ["A road-maintenance message reports an East Bridge restriction."],
        evidenceAgainst: ["The restriction scope and effective time are not authenticated."],
        assumptions: ["Ridge Bypass remains usable by the assigned vehicle.", "The water station can accept V2H from the alternate approach."],
        confidence: 0.36,
      },
      {
        id: "h3",
        title: "High-output asset lost under adverse peak",
        interpretation: "East Bridge is closed, E-44 is unavailable and the vehicle must absorb a 6.5 kW pump start-up peak.",
        blockedRouteIds: ["east-bridge"],
        unavailableVehicleIds: ["E-44"],
        waterPeakMode: "adverse",
        evidenceFor: ["A fleet message reports E-44 committed elsewhere.", "The pump controller has not confirmed local inrush limiting."],
        evidenceAgainst: ["Both messages are provisional and may refer to an earlier operating state."],
        assumptions: ["No other registered asset exceeds the modeled 6.5 kW peak.", "The road restriction remains active for the planning window."],
        confidence: 0.22,
      },
    ],
    evidenceQuestions: [
      {
        id: "q1",
        question: "Can the East Water Station electrically authenticate that the vehicle sees no more than a 4.2 kW start-up peak?",
        evidenceKey: "need:water:peak",
        evidenceToRequest: "A timestamped controller or qualified-operator reading covering start-up peak power, not only average consumption.",
        whyItMatters: "A continuous-energy calculation cannot prove that the assigned inverter survives the momentary start-up peak.",
      },
      {
        id: "q2",
        question: "Is E-44 available for the complete response window?",
        evidenceKey: "vehicle:E-44",
        evidenceToRequest: "Authenticated fleet status including location, SoC, connector readiness and current commitment.",
        whyItMatters: "E-44 is the only modeled asset with enough output for the adverse water-pump peak.",
      },
      {
        id: "q3",
        question: "Is East Bridge closed to the modeled vehicle class for this mission window?",
        evidenceKey: "route:east-bridge",
        evidenceToRequest: "A timestamped road-authority restriction with segment, direction, vehicle class and validity interval.",
        whyItMatters: "A closure changes the feasible approach and can force a whole-plan reassignment.",
      },
    ],
    recommendedHypothesisId: "h2",
    uncertainty: "The three worlds are falsifiable planning states, not probabilities or diagnoses. Their support values are epistemic labels only.",
    decisionLimit: "Do not dispatch, connect equipment or open a route from model reasoning alone. An authorized human must verify the selected fact and approve the simulation state.",
  };
}

function assignmentRecord(plan: DispatchPlan) {
  return Object.fromEntries(plan.assignments.map((assignment) => [assignment.need.id, assignment.vehicle.id]));
}

function changedAssignments(reference: DispatchPlan, next: DispatchPlan) {
  const before = assignmentRecord(reference);
  const after = assignmentRecord(next);
  return Object.keys(before).filter((needId) => before[needId] !== after[needId]).length;
}

function evaluateWorld(hypothesis: EmergencyPowerHypothesis, reference: DispatchPlan): EmergencyWorldEvaluation {
  const decision = buildDecisionAnalysis(DEFAULT_NEEDS);
  const needs = hypothesis.waterPeakMode === "adverse"
    ? applyDecisionAnswer(DEFAULT_NEEDS, decision.topQuestion, "adverse")
    : applyDecisionAnswer(DEFAULT_NEEDS, decision.topQuestion, "confirmed");
  const context = { unavailableVehicleIds: hypothesis.unavailableVehicleIds };
  const plan = buildVerifiedPlan(hypothesis.blockedRouteIds, needs, context);
  const greedyPlan = buildGreedyBaseline(hypothesis.blockedRouteIds, needs, context);
  const stress = plan.optimization!;
  return {
    hypothesisId: hypothesis.id,
    title: hypothesis.title,
    plan,
    greedyPlan,
    metrics: {
      criticalSiteHours: plan.criticalSiteHours,
      unservedCriticalKwh: plan.unservedCriticalKwh,
      fullMissionSuccessRate: stress.optimized.successRate,
      criticalSuccessRate: stress.optimized.criticalSuccessRate,
      safeAssignments: plan.assignments.filter((assignment) => assignment.safe).length,
      assignmentChanges: changedAssignments(reference, plan),
    },
    algorithmEvidence: {
      candidatePlans: stress.candidatePlans,
      stressScenarios: stress.scenarioCount,
      planScenarioEvaluations: stress.scenarioEvaluations,
      greedyViolationScenarios: stress.baseline.violationScenarios,
      exactOptimalityCertified: stress.optimalityCertified,
    },
  };
}

function evidenceState(world: EmergencyPowerHypothesis, key: EmergencyEvidenceKey) {
  if (key === "need:water:peak") return world.waterPeakMode;
  if (key.startsWith("route:")) return world.blockedRouteIds.includes(key.slice(6)) ? "blocked" : "open";
  return world.unavailableVehicleIds.includes(key.slice(8)) ? "unavailable" : "available";
}

export function adjudicateEmergencyReasoning(proposal: EmergencyReasoningProposal): EmergencyReasoningAdjudication {
  if (!validateEmergencyReasoningProposal(proposal)) throw new Error("Invalid emergency reasoning proposal");
  const reference = buildVerifiedPlan([], applyDecisionAnswer(DEFAULT_NEEDS, buildDecisionAnalysis(DEFAULT_NEEDS).topQuestion, "confirmed"));
  const evaluations = proposal.hypotheses.map((hypothesis) => evaluateWorld(hypothesis, reference));
  const evaluationById = new Map(evaluations.map((item) => [item.hypothesisId, item]));
  const ranked = proposal.evidenceQuestions.map((question) => {
    let criticalEnergySwingKwh = 0;
    let criticalCoverageSwingHours = 0;
    let fullMissionSuccessSwingPoints = 0;
    let safeAssignmentSwing = 0;
    proposal.hypotheses.forEach((left, leftIndex) => proposal.hypotheses.slice(leftIndex + 1).forEach((right) => {
      if (evidenceState(left, question.evidenceKey) === evidenceState(right, question.evidenceKey)) return;
      const leftMetrics = evaluationById.get(left.id)!.metrics;
      const rightMetrics = evaluationById.get(right.id)!.metrics;
      criticalEnergySwingKwh = Math.max(criticalEnergySwingKwh, Math.abs(leftMetrics.unservedCriticalKwh - rightMetrics.unservedCriticalKwh));
      criticalCoverageSwingHours = Math.max(criticalCoverageSwingHours, Math.abs(leftMetrics.criticalSiteHours - rightMetrics.criticalSiteHours));
      fullMissionSuccessSwingPoints = Math.max(fullMissionSuccessSwingPoints, Math.abs(leftMetrics.fullMissionSuccessRate - rightMetrics.fullMissionSuccessRate));
      safeAssignmentSwing = Math.max(safeAssignmentSwing, Math.abs(leftMetrics.safeAssignments - rightMetrics.safeAssignments));
    }));
    const valueScore = Number((criticalEnergySwingKwh * 100 + criticalCoverageSwingHours * 50 + fullMissionSuccessSwingPoints * 10 + safeAssignmentSwing * 25).toFixed(1));
    return { ...question, rank: 0, valueScore, criticalEnergySwingKwh, criticalCoverageSwingHours, fullMissionSuccessSwingPoints, safeAssignmentSwing };
  }).sort((left, right) => right.valueScore - left.valueScore || left.id.localeCompare(right.id))
    .map((question, index) => ({ ...question, rank: index + 1 }));
  const highestValueQuestion = ranked[0];
  return {
    evaluations,
    rankedEvidenceQuestions: ranked,
    highestValueQuestion,
    modelRecommendationStatus: "withheld_pending_evidence",
    modelRecommendedHypothesisId: proposal.recommendedHypothesisId,
    actionGate: "human_authority_required",
    computationalEvidence: {
      worldsReplanned: 3,
      exactAssignmentCandidates: evaluations.reduce((sum, item) => sum + item.algorithmEvidence.candidatePlans, 0),
      stressScenarios: evaluations.reduce((sum, item) => sum + item.algorithmEvidence.stressScenarios, 0),
      planScenarioEvaluations: evaluations.reduce((sum, item) => sum + item.algorithmEvidence.planScenarioEvaluations, 0),
    },
    advisoryConclusion: `Withhold the model recommendation. First obtain: ${highestValueQuestion.evidenceToRequest}`,
  };
}

export async function buildEmergencyCouncilEvidence(
  proposal: EmergencyReasoningProposal,
  adjudication: EmergencyReasoningAdjudication,
  inspectedHypothesisId: EmergencyHypothesisId | null,
  mode: "gpt-5.6-sol" | "demo-fallback",
) {
  const core = {
    schemaVersion: EMERGENCY_REASONING_SCHEMA_VERSION,
    model: "gpt-5.6-sol",
    mode,
    proposal,
    adjudication,
    inspectedHypothesisId,
    gates: {
      modelRecommendation: "withheld_pending_evidence",
      worldAutoApplication: "prohibited",
      dispatch: "human_dual_control_required",
      fieldOperation: "blocked",
    },
    boundary: "Synthetic advisory planning only. No road, vehicle, electrical connection or dispatch state is authorized by this evidence package.",
  };
  return { ...core, evidenceDigest: `sha256:${await sha256Hex(canonicalize(core))}` };
}
