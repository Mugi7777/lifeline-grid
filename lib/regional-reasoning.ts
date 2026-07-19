import {
  REGIONAL_MODEL,
  analyzeRegionalAccess,
  type RegionalModel,
  type RegionalPlanMetrics,
  type RegionalStressResult,
} from "./regional.ts";

export const REASONING_HYPOTHESIS_IDS = ["h1", "h2", "h3"] as const;
export const REASONING_EVIDENCE_CLASSES = [
  "authority_status",
  "restriction_scope",
  "restriction_duration",
  "fleet_availability",
  "demand_deadline",
  "road_observation",
] as const;

export type ReasoningHypothesisId = (typeof REASONING_HYPOTHESIS_IDS)[number];
export type ReasoningRoadState = "open" | "closed" | "weight_limited";
export type ReasoningEvidenceClass = (typeof REASONING_EVIDENCE_CLASSES)[number];

export interface RegionalReasoningHypothesis {
  id: ReasoningHypothesisId;
  title: string;
  roadSegmentId: string;
  state: ReasoningRoadState;
  weightLimitT: number;
  claim: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  assumptions: string[];
  confidence: number;
}

export interface RegionalReasoningQuestion {
  id: "q1" | "q2" | "q3";
  evidenceClass: ReasoningEvidenceClass;
  question: string;
  evidenceToRequest: string;
  ifYesHypothesisId: ReasoningHypothesisId;
  ifNoHypothesisId: ReasoningHypothesisId;
  urgency: "immediate" | "current_shift" | "next_planning_cycle";
  rationale: string;
}

export interface RegionalReasoningProposal {
  situationSummary: string;
  authoritySignal: "confirmed" | "unconfirmed" | "conflicting";
  hypotheses: RegionalReasoningHypothesis[];
  questions: RegionalReasoningQuestion[];
  recommendedHypothesisId: ReasoningHypothesisId;
  uncertaintySummary: string;
  decisionLimit: string;
}

export interface RegionalHypothesisEvaluation {
  hypothesisId: ReasoningHypothesisId;
  title: string;
  roadSegmentId: string;
  roadLabel: string;
  state: ReasoningRoadState;
  weightLimitT: number | null;
  metrics: RegionalPlanMetrics;
  stress: RegionalStressResult;
  householdsAffected: number;
  vulnerableResidentsAffected: number;
  verdict: "modeled_for_review" | "service_gap" | "critical_service_gap";
  optimalityCertified: boolean;
  candidateAssignments: number;
}

export interface RegionalQuestionEvaluation extends RegionalReasoningQuestion {
  accessSwingHouseholds: number;
  vulnerableSwingResidents: number;
  criticalFailureSwing: number;
  criticalStressSwingPercent: number;
  distanceSwingKm: number;
  deterministicValueScore: number;
  safetyGate: boolean;
}

export interface RegionalReasoningAdjudication {
  actionGate: "human_authority_required";
  modelRecommendationStatus: "withheld_pending_evidence";
  modelRecommendedHypothesisId: ReasoningHypothesisId;
  evaluations: RegionalHypothesisEvaluation[];
  rankedQuestions: RegionalQuestionEvaluation[];
  highestValueQuestion: RegionalQuestionEvaluation;
  disagreement: {
    distinctRoadStates: number;
    householdAccessRange: number;
    vulnerableAccessRange: number;
    criticalFailureRange: number;
  };
  computationalEvidence: {
    hypothesesEvaluated: number;
    activePlanCandidateAssignments: number;
    stressScenarios: number;
    nMinusOneRoadCases: number;
    deterministic: true;
  };
  advisoryConclusion: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedStrings(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => typeof item === "string" && item.length > 0 && item.length <= maxLength);
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function validateRegionalReasoningProposal(
  value: unknown,
  model: RegionalModel = REGIONAL_MODEL,
): value is RegionalReasoningProposal {
  if (!isRecord(value)
    || !boundedText(value.situationSummary, 600)
    || !["confirmed", "unconfirmed", "conflicting"].includes(String(value.authoritySignal))
    || !REASONING_HYPOTHESIS_IDS.includes(value.recommendedHypothesisId as ReasoningHypothesisId)
    || !boundedText(value.uncertaintySummary, 600)
    || !boundedText(value.decisionLimit, 400)
    || !Array.isArray(value.hypotheses)
    || value.hypotheses.length !== 3
    || !Array.isArray(value.questions)
    || value.questions.length < 1
    || value.questions.length > 3) return false;

  const roadIds = new Set(model.roads.map((road) => road.id));
  const hypothesisIds = new Set<string>();
  for (const raw of value.hypotheses) {
    if (!isRecord(raw)
      || !REASONING_HYPOTHESIS_IDS.includes(raw.id as ReasoningHypothesisId)
      || hypothesisIds.has(String(raw.id))
      || !boundedText(raw.title, 120)
      || !roadIds.has(String(raw.roadSegmentId))
      || !["open", "closed", "weight_limited"].includes(String(raw.state))
      || typeof raw.weightLimitT !== "number"
      || !Number.isFinite(raw.weightLimitT)
      || raw.weightLimitT < 0
      || raw.weightLimitT > 12
      || !boundedText(raw.claim, 500)
      || !boundedStrings(raw.evidenceFor, 4, 300)
      || !boundedStrings(raw.evidenceAgainst, 4, 300)
      || !boundedStrings(raw.assumptions, 4, 300)
      || typeof raw.confidence !== "number"
      || !Number.isFinite(raw.confidence)
      || raw.confidence < 0
      || raw.confidence > 1) return false;
    if (raw.state === "weight_limited" && (raw.weightLimitT < 2 || raw.weightLimitT > 10)) return false;
    if (raw.state !== "weight_limited" && raw.weightLimitT !== 0) return false;
    hypothesisIds.add(String(raw.id));
  }
  if (REASONING_HYPOTHESIS_IDS.some((id) => !hypothesisIds.has(id))) return false;

  const questionIds = new Set<string>();
  for (const raw of value.questions) {
    if (!isRecord(raw)
      || !["q1", "q2", "q3"].includes(String(raw.id))
      || questionIds.has(String(raw.id))
      || !REASONING_EVIDENCE_CLASSES.includes(raw.evidenceClass as ReasoningEvidenceClass)
      || !boundedText(raw.question, 300)
      || !boundedText(raw.evidenceToRequest, 300)
      || !hypothesisIds.has(String(raw.ifYesHypothesisId))
      || !hypothesisIds.has(String(raw.ifNoHypothesisId))
      || raw.ifYesHypothesisId === raw.ifNoHypothesisId
      || !["immediate", "current_shift", "next_planning_cycle"].includes(String(raw.urgency))
      || !boundedText(raw.rationale, 400)) return false;
    questionIds.add(String(raw.id));
  }
  return true;
}

export function fallbackRegionalReasoning(): RegionalReasoningProposal {
  return {
    situationSummary: "Heavy-rain reports disagree on whether North Forest Road remains passable; no authenticated road-authority state is available, while time-sensitive deliveries continue.",
    authoritySignal: "conflicting",
    hypotheses: [
      {
        id: "h1",
        title: "Full closure is confirmed",
        roadSegmentId: "center-north",
        state: "closed",
        weightLimitT: 0,
        claim: "Model North Forest Road as unavailable for the current planning window if the road authority confirms a closure.",
        evidenceFor: ["A community report describes debris and possible retaining-wall movement."],
        evidenceAgainst: ["No authenticated road-authority closure notice is present."],
        assumptions: ["The reported location refers to North Forest Road.", "The closure applies in both directions."],
        confidence: 0.52,
      },
      {
        id: "h2",
        title: "Temporary four-tonne restriction",
        roadSegmentId: "center-north",
        state: "weight_limited",
        weightLimitT: 4,
        claim: "Model a temporary four-tonne limit if the authority permits light vehicles but excludes the municipal bus.",
        evidenceFor: ["A second report says smaller vehicles are still passing."],
        evidenceAgainst: ["The exact restriction threshold has not been issued."],
        assumptions: ["Light-vehicle passage is official rather than informal.", "A four-tonne threshold represents the temporary order."],
        confidence: 0.41,
      },
      {
        id: "h3",
        title: "Road remains open pending inspection",
        roadSegmentId: "center-north",
        state: "open",
        weightLimitT: 0,
        claim: "Retain the verified network state only if the authority confirms that no restriction is active.",
        evidenceFor: ["One driver reports that small vehicles are still moving through the corridor."],
        evidenceAgainst: ["Community observations conflict and do not establish structural safety."],
        assumptions: ["No formal restriction has been issued.", "Observed passage does not prove the road is safe."],
        confidence: 0.35,
      },
    ],
    questions: [
      {
        id: "q1",
        evidenceClass: "authority_status",
        question: "What signed or authenticated status has the road authority issued for North Forest Road?",
        evidenceToRequest: "Authority event ID, effective time, permitted vehicle classes, and source timestamp.",
        ifYesHypothesisId: "h1",
        ifNoHypothesisId: "h3",
        urgency: "immediate",
        rationale: "Authority state determines whether the planner must remove the link or preserve the last verified graph.",
      },
      {
        id: "q2",
        evidenceClass: "restriction_scope",
        question: "If passage is permitted, what enforceable vehicle-weight threshold applies?",
        evidenceToRequest: "Published weight limit, direction, vehicle exceptions, and effective time.",
        ifYesHypothesisId: "h2",
        ifNoHypothesisId: "h3",
        urgency: "immediate",
        rationale: "A partial restriction changes which pooled fleet vehicles can use the corridor.",
      },
      {
        id: "q3",
        evidenceClass: "restriction_duration",
        question: "Will the restriction remain active beyond the current delivery window?",
        evidenceToRequest: "Next inspection time, expected clearance time, and authority update cadence.",
        ifYesHypothesisId: "h1",
        ifNoHypothesisId: "h2",
        urgency: "current_shift",
        rationale: "Duration changes whether operators need a one-cycle re-plan or a sustained alternate service pattern.",
      },
    ],
    recommendedHypothesisId: "h2",
    uncertaintySummary: "Passage reports conflict, the responsible authority has not been authenticated, and neither the scope nor duration of a restriction is known.",
    decisionLimit: "The reasoning layer may propose testable worlds, but it cannot diagnose the road, create a legal restriction, or authorize dispatch.",
  };
}

function modelForHypothesis(model: RegionalModel, hypothesis: RegionalReasoningHypothesis) {
  if (hypothesis.state !== "weight_limited") return model;
  return {
    ...model,
    roads: model.roads.map((road) => road.id === hypothesis.roadSegmentId
      ? { ...road, weightLimitT: Math.min(road.weightLimitT, hypothesis.weightLimitT) }
      : road),
  };
}

function range(values: number[]) {
  return values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function evaluateQuestion(
  question: RegionalReasoningQuestion,
  byId: Map<ReasoningHypothesisId, RegionalHypothesisEvaluation>,
): RegionalQuestionEvaluation {
  const yes = byId.get(question.ifYesHypothesisId);
  const no = byId.get(question.ifNoHypothesisId);
  if (!yes || !no) throw new Error("Question references an unknown hypothesis");
  const accessSwingHouseholds = Math.abs(yes.metrics.householdsCovered - no.metrics.householdsCovered);
  const vulnerableSwingResidents = Math.abs(yes.metrics.vulnerableResidentsCovered - no.metrics.vulnerableResidentsCovered);
  const criticalFailureSwing = Math.abs(yes.metrics.criticalFailures - no.metrics.criticalFailures);
  const criticalStressSwingPercent = round(Math.abs(yes.stress.criticalServiceSuccessRate - no.stress.criticalServiceSuccessRate));
  const distanceSwingKm = round(Math.abs(yes.metrics.totalDistanceKm - no.metrics.totalDistanceKm));
  const safetyGate = question.evidenceClass === "authority_status";
  const deterministicValueScore = Math.round(
    (safetyGate ? 1_000_000 : 0)
    + criticalFailureSwing * 100_000
    + criticalStressSwingPercent * 1_000
    + vulnerableSwingResidents * 500
    + accessSwingHouseholds * 50
    + distanceSwingKm * 10,
  );
  return {
    ...question,
    accessSwingHouseholds,
    vulnerableSwingResidents,
    criticalFailureSwing,
    criticalStressSwingPercent,
    distanceSwingKm,
    deterministicValueScore,
    safetyGate,
  };
}

export function adjudicateRegionalReasoning(
  proposal: RegionalReasoningProposal,
  budgetM = 120,
  model: RegionalModel = REGIONAL_MODEL,
): RegionalReasoningAdjudication {
  if (!validateRegionalReasoningProposal(proposal, model)) throw new Error("Invalid regional reasoning proposal");
  const reference = analyzeRegionalAccess(null, budgetM, model).baseline.metrics;
  const roadById = new Map(model.roads.map((road) => [road.id, road]));
  const evaluations = proposal.hypotheses.map((hypothesis): RegionalHypothesisEvaluation => {
    const hypothesisModel = modelForHypothesis(model, hypothesis);
    const closedSegmentId = hypothesis.state === "closed" ? hypothesis.roadSegmentId : null;
    const analysis = analyzeRegionalAccess(closedSegmentId, budgetM, hypothesisModel);
    const metrics = analysis.activePlan.metrics;
    const householdsAffected = Math.max(0, reference.householdsCovered - metrics.householdsCovered);
    const vulnerableResidentsAffected = Math.max(0, reference.vulnerableResidentsCovered - metrics.vulnerableResidentsCovered);
    const verdict = metrics.criticalFailures > 0 || analysis.stress.criticalServiceSuccessRate < 100
      ? "critical_service_gap"
      : householdsAffected > 0 || vulnerableResidentsAffected > 0
        ? "service_gap"
        : "modeled_for_review";
    return {
      hypothesisId: hypothesis.id,
      title: hypothesis.title,
      roadSegmentId: hypothesis.roadSegmentId,
      roadLabel: roadById.get(hypothesis.roadSegmentId)?.label ?? hypothesis.roadSegmentId,
      state: hypothesis.state,
      weightLimitT: hypothesis.state === "weight_limited" ? hypothesis.weightLimitT : null,
      metrics,
      stress: analysis.stress,
      householdsAffected,
      vulnerableResidentsAffected,
      verdict,
      optimalityCertified: analysis.activePlan.optimalityCertified,
      candidateAssignments: analysis.activePlan.candidateAssignments,
    };
  });
  const byId = new Map(evaluations.map((evaluation) => [evaluation.hypothesisId, evaluation]));
  const rankedQuestions = proposal.questions
    .map((question) => evaluateQuestion(question, byId))
    .sort((left, right) => right.deterministicValueScore - left.deterministicValueScore || left.id.localeCompare(right.id));
  const highestValueQuestion = rankedQuestions[0];
  if (!highestValueQuestion) throw new Error("Reasoning proposal did not include an evidence question");
  return {
    actionGate: "human_authority_required",
    modelRecommendationStatus: "withheld_pending_evidence",
    modelRecommendedHypothesisId: proposal.recommendedHypothesisId,
    evaluations,
    rankedQuestions,
    highestValueQuestion,
    disagreement: {
      distinctRoadStates: new Set(proposal.hypotheses.map((hypothesis) => `${hypothesis.state}:${hypothesis.weightLimitT}`)).size,
      householdAccessRange: range(evaluations.map((item) => item.metrics.householdsCovered)),
      vulnerableAccessRange: range(evaluations.map((item) => item.metrics.vulnerableResidentsCovered)),
      criticalFailureRange: range(evaluations.map((item) => item.metrics.criticalFailures)),
    },
    computationalEvidence: {
      hypothesesEvaluated: evaluations.length,
      activePlanCandidateAssignments: evaluations.reduce((sum, item) => sum + item.candidateAssignments, 0),
      stressScenarios: evaluations.reduce((sum, item) => sum + item.stress.scenarioCount, 0),
      nMinusOneRoadCases: evaluations.length * model.roads.length,
      deterministic: true,
    },
    advisoryConclusion: `Do not select a road state from narrative reasoning alone. First obtain: ${highestValueQuestion.evidenceToRequest}`,
  };
}
