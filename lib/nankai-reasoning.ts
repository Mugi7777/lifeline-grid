import {
  NANKAI_NODES,
  NANKAI_ROADS,
  analyzeNankaiResponse,
  buildNankaiEvidence,
  type NankaiPhase,
  type NankaiResponseAnalysis,
  type NankaiRoadState,
} from "./nankai-response.ts";
import { sha256Hex } from "./regional-contract.ts";

export const NANKAI_REASONING_SCHEMA_VERSION = "2026-07-19.1";
export const NANKAI_REASONING_HYPOTHESIS_IDS = ["h1", "h2", "h3"] as const;
export const NANKAI_REASONING_EVIDENCE_CLASSES = [
  "road_authority_status",
  "drone_visual_confirmation",
  "hospital_acceptance",
  "power_runtime",
  "inventory_count",
  "airspace_weather",
  "field_team_report",
] as const;

export type NankaiReasoningHypothesisId = (typeof NANKAI_REASONING_HYPOTHESIS_IDS)[number];
export type NankaiReasoningEvidenceClass = (typeof NANKAI_REASONING_EVIDENCE_CLASSES)[number];

export interface NankaiReasoningRoadChange {
  roadId: string;
  state: NankaiRoadState;
  rationale: string;
}

export interface NankaiReasoningHypothesis {
  id: NankaiReasoningHypothesisId;
  title: string;
  claim: string;
  roadChanges: NankaiReasoningRoadChange[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  assumptions: string[];
  confidence: number;
}

export interface NankaiReasoningQuestion {
  id: "q1" | "q2" | "q3";
  evidenceClass: NankaiReasoningEvidenceClass;
  targetRoadId: string;
  question: string;
  evidenceToRequest: string;
  ifYesHypothesisId: NankaiReasoningHypothesisId;
  ifNoHypothesisId: NankaiReasoningHypothesisId;
  urgency: "immediate" | "current_shift" | "next_planning_cycle";
  rationale: string;
}

export interface NankaiReasoningProposal {
  schemaVersion: typeof NANKAI_REASONING_SCHEMA_VERSION;
  situationSummary: string;
  authoritySignal: "confirmed" | "unconfirmed" | "conflicting";
  hypotheses: NankaiReasoningHypothesis[];
  questions: NankaiReasoningQuestion[];
  recommendedHypothesisId: NankaiReasoningHypothesisId;
  uncertaintySummary: string;
  decisionLimit: string;
}

export interface NankaiWorldEvaluation {
  hypothesisId: NankaiReasoningHypothesisId;
  title: string;
  roadChanges: NankaiReasoningRoadChange[];
  roadStateOverrides: Partial<Record<string, NankaiRoadState>>;
  metrics: NankaiResponseAnalysis["metrics"];
  droneWeightedCoveragePercent: number;
  topClearanceRoadId: string | null;
  topClearanceScore: number | null;
  exactAssignmentCandidates: number;
  verdict: "modeled_for_review" | "critical_gap" | "severe_access_gap";
}

export interface NankaiQuestionEvaluation extends NankaiReasoningQuestion {
  supplyCoverageSwingPoints: number;
  criticalPowerGapSwing: number;
  groundTransferSwing: number;
  airRequestSwing: number;
  inaccessibleLocationSwing: number;
  droneCoverageSwingPoints: number;
  deterministicValueScore: number;
  actionGate: "human_authority_required";
}

export interface NankaiReasoningAdjudication {
  actionGate: "human_authority_required";
  modelRecommendationStatus: "withheld_pending_evidence";
  modelRecommendedHypothesisId: NankaiReasoningHypothesisId;
  evaluations: NankaiWorldEvaluation[];
  rankedQuestions: NankaiQuestionEvaluation[];
  highestValueQuestion: NankaiQuestionEvaluation;
  disagreement: {
    distinctWorlds: number;
    supplyCoverageRangePoints: number;
    criticalPowerGapRange: number;
    groundTransferRange: number;
    airRequestRange: number;
    inaccessibleLocationRange: number;
  };
  computationalEvidence: {
    worldsReplanned: number;
    exactAssignmentCandidates: number;
    routeSearches: number;
    minCostFlowAugmentations: number;
    roadClearanceCounterfactuals: number;
    deterministic: true;
  };
  advisoryConclusion: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function boundedStrings(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= maxItems
    && value.every((item) => boundedText(item, maxLength));
}

function worldFingerprint(hypothesis: NankaiReasoningHypothesis) {
  return hypothesis.roadChanges
    .map((change) => `${change.roadId}:${change.state}`)
    .sort()
    .join("|");
}

export function validateNankaiReasoningProposal(value: unknown): value is NankaiReasoningProposal {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ["schemaVersion", "situationSummary", "authoritySignal", "hypotheses", "questions", "recommendedHypothesisId", "uncertaintySummary", "decisionLimit"])
    || value.schemaVersion !== NANKAI_REASONING_SCHEMA_VERSION
    || !boundedText(value.situationSummary, 700)
    || !["confirmed", "unconfirmed", "conflicting"].includes(String(value.authoritySignal))
    || !NANKAI_REASONING_HYPOTHESIS_IDS.includes(value.recommendedHypothesisId as NankaiReasoningHypothesisId)
    || !boundedText(value.uncertaintySummary, 700)
    || !boundedText(value.decisionLimit, 500)
    || !Array.isArray(value.hypotheses)
    || value.hypotheses.length !== 3
    || !Array.isArray(value.questions)
    || value.questions.length < 1
    || value.questions.length > 3) return false;

  const supportedRoadIds = new Set(NANKAI_ROADS.map((road) => road.id));
  const hypothesisIds = new Set<string>();
  const fingerprints = new Set<string>();
  for (const raw of value.hypotheses) {
    if (!isRecord(raw)
      || !hasOnlyKeys(raw, ["id", "title", "claim", "roadChanges", "evidenceFor", "evidenceAgainst", "assumptions", "confidence"])
      || !NANKAI_REASONING_HYPOTHESIS_IDS.includes(raw.id as NankaiReasoningHypothesisId)
      || hypothesisIds.has(String(raw.id))
      || !boundedText(raw.title, 140)
      || !boundedText(raw.claim, 600)
      || !boundedStrings(raw.evidenceFor, 5, 350)
      || !boundedStrings(raw.evidenceAgainst, 5, 350)
      || !boundedStrings(raw.assumptions, 5, 350)
      || typeof raw.confidence !== "number"
      || !Number.isFinite(raw.confidence)
      || raw.confidence < 0
      || raw.confidence > 1
      || !Array.isArray(raw.roadChanges)
      || raw.roadChanges.length < 1
      || raw.roadChanges.length > 4) return false;
    const changedRoadIds = new Set<string>();
    for (const change of raw.roadChanges) {
      if (!isRecord(change)
        || !hasOnlyKeys(change, ["roadId", "state", "rationale"])
        || !supportedRoadIds.has(String(change.roadId))
        || changedRoadIds.has(String(change.roadId))
        || !["open", "degraded", "unknown", "blocked"].includes(String(change.state))
        || !boundedText(change.rationale, 350)) return false;
      changedRoadIds.add(String(change.roadId));
    }
    const fingerprint = worldFingerprint(raw as unknown as NankaiReasoningHypothesis);
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    hypothesisIds.add(String(raw.id));
  }
  if (NANKAI_REASONING_HYPOTHESIS_IDS.some((id) => !hypothesisIds.has(id))) return false;

  const questionIds = new Set<string>();
  for (const raw of value.questions) {
    if (!isRecord(raw)
      || !hasOnlyKeys(raw, ["id", "evidenceClass", "targetRoadId", "question", "evidenceToRequest", "ifYesHypothesisId", "ifNoHypothesisId", "urgency", "rationale"])
      || !["q1", "q2", "q3"].includes(String(raw.id))
      || questionIds.has(String(raw.id))
      || !NANKAI_REASONING_EVIDENCE_CLASSES.includes(raw.evidenceClass as NankaiReasoningEvidenceClass)
      || !supportedRoadIds.has(String(raw.targetRoadId))
      || !boundedText(raw.question, 350)
      || !boundedText(raw.evidenceToRequest, 350)
      || !hypothesisIds.has(String(raw.ifYesHypothesisId))
      || !hypothesisIds.has(String(raw.ifNoHypothesisId))
      || raw.ifYesHypothesisId === raw.ifNoHypothesisId
      || !["immediate", "current_shift", "next_planning_cycle"].includes(String(raw.urgency))
      || !boundedText(raw.rationale, 450)) return false;
    questionIds.add(String(raw.id));
  }
  return true;
}

export function fallbackNankaiReasoning(): NankaiReasoningProposal {
  return {
    schemaVersion: NANKAI_REASONING_SCHEMA_VERSION,
    situationSummary: "Synthetic reports conflict on whether coastal access has failed completely or remains usable with delay. Drone imagery is unverified, the road authority has not reconciled its messages, and the coastal hospital reports a short backup-power horizon.",
    authoritySignal: "conflicting",
    hypotheses: [
      {
        id: "h1",
        title: "Coastal ground access remains severed",
        claim: "Keep the coastal and hospital relief approaches unavailable until an authenticated authority state proves otherwise.",
        roadChanges: [
          { roadId: "airbase-coastal", state: "blocked", rationale: "Unverified standing water and debris may prevent ground access from air staging." },
          { roadId: "hospital-central", state: "blocked", rationale: "The reported central approach obstruction is treated as unavailable in this world." },
          { roadId: "hospital-east", state: "unknown", rationale: "No reconciled authority status is available for the eastern hospital corridor." },
        ],
        evidenceFor: ["A drone observer reports vehicles turning around near the coastal approach.", "The coastal hospital reports no confirmed ground resupply route."],
        evidenceAgainst: ["A local responder reports one light vehicle traversed part of the approach."],
        assumptions: ["The turn-around location maps to the modeled air-staging corridor.", "Reported passage does not establish end-to-end usability."],
        confidence: 0.55,
      },
      {
        id: "h2",
        title: "Restricted relief corridors remain usable",
        claim: "Model the hospital and eastern corridors as degraded while keeping the final coastal link unverified.",
        roadChanges: [
          { roadId: "airbase-coastal", state: "unknown", rationale: "The final approach lacks authenticated end-to-end confirmation." },
          { roadId: "hospital-central", state: "degraded", rationale: "A controlled low-speed passage may be possible on the central relief corridor." },
          { roadId: "hospital-east", state: "degraded", rationale: "Conflicting reports support delayed passage rather than full closure." },
        ],
        evidenceFor: ["Separate reports describe slow light-vehicle movement on two inland approaches."],
        evidenceAgainst: ["Neither report includes an authority event, full-route inspection, or effective time."],
        assumptions: ["Degraded travel time represents escorted low-speed passage.", "No unreported bridge or tsunami exclusion blocks the route."],
        confidence: 0.43,
      },
      {
        id: "h3",
        title: "Air-staging road and east relief path are usable",
        claim: "Test a world where authenticated inspection confirms the air-staging and eastern corridors while the central approach remains degraded.",
        roadChanges: [
          { roadId: "airbase-coastal", state: "open", rationale: "A complete authority inspection is assumed to confirm the road for the exercise vehicle class." },
          { roadId: "hospital-central", state: "degraded", rationale: "Central access remains slower while debris clearance continues." },
          { roadId: "hospital-east", state: "open", rationale: "The eastern relief corridor is assumed confirmed end to end." },
        ],
        evidenceFor: ["An air-staging liaison reports a possible continuous ground path to the coastal area."],
        evidenceAgainst: ["The report lacks a signed road status, inspection scope, and timestamp."],
        assumptions: ["The inspection covers the full modeled segment and relevant vehicle classes.", "No later tsunami or aftershock alert supersedes it."],
        confidence: 0.31,
      },
    ],
    questions: [
      {
        id: "q1",
        evidenceClass: "road_authority_status",
        targetRoadId: "airbase-coastal",
        question: "Has the road authority authenticated end-to-end usability of the air-staging to coastal-hospital corridor for the current vehicle class?",
        evidenceToRequest: "Signed corridor status, effective time, inspected endpoints, permitted vehicle class, and superseding-event sequence.",
        ifYesHypothesisId: "h3",
        ifNoHypothesisId: "h1",
        urgency: "immediate",
        rationale: "This state can change coastal supply, mobile power, patient-transfer feasibility, and road-clearance priority together.",
      },
      {
        id: "q2",
        evidenceClass: "field_team_report",
        targetRoadId: "hospital-central",
        question: "Did an authorized field team verify continuous low-speed passage across the complete hospital-central corridor?",
        evidenceToRequest: "Geolocated endpoint-to-endpoint inspection, timestamp, vehicle class, obstruction limits, and approving authority.",
        ifYesHypothesisId: "h2",
        ifNoHypothesisId: "h1",
        urgency: "immediate",
        rationale: "Partial observations cannot prove the modeled corridor is connected end to end.",
      },
      {
        id: "q3",
        evidenceClass: "drone_visual_confirmation",
        targetRoadId: "hospital-east",
        question: "Does verified current imagery show an uninterrupted eastern relief corridor rather than isolated passable sections?",
        evidenceToRequest: "Time-synchronized imagery, full segment coverage, geolocation, weather limitations, and human reviewer identity.",
        ifYesHypothesisId: "h3",
        ifNoHypothesisId: "h2",
        urgency: "current_shift",
        rationale: "The eastern path changes ground access but imagery alone still cannot authorize use.",
      },
    ],
    recommendedHypothesisId: "h1",
    uncertaintySummary: "The largest uncertainty is not narrative plausibility; it is whether an authenticated, current, vehicle-scoped corridor status exists across the complete coastal approach.",
    decisionLimit: "Do not infer road safety, hospital acceptance, dispatch permission, drone launch authority, or aircraft tasking from these hypotheses.",
  };
}

function roadOverrides(hypothesis: NankaiReasoningHypothesis) {
  return Object.fromEntries(hypothesis.roadChanges.map((change) => [change.roadId, change.state])) as Partial<Record<string, NankaiRoadState>>;
}

function numericRange(values: number[]) {
  return Number((Math.max(...values) - Math.min(...values)).toFixed(1));
}

function solveWorld(hypothesis: NankaiReasoningHypothesis, phase: NankaiPhase) {
  const overrides = roadOverrides(hypothesis);
  const analysis = analyzeNankaiResponse(phase, null, overrides);
  const exactAssignmentCandidates = analysis.evidence.exactPowerAssignments
    + analysis.evidence.exactMedicalAssignments
    + analysis.evidence.exactDroneAssignments;
  const verdict = analysis.metrics.inaccessibleLocations >= 3 || analysis.metrics.medicalCasesPlanned === 0
    ? "severe_access_gap"
    : analysis.metrics.powerCriticalGaps > 0 || analysis.metrics.medicalAirRequests > 0
      ? "critical_gap"
      : "modeled_for_review";
  const evaluation: NankaiWorldEvaluation = {
    hypothesisId: hypothesis.id,
    title: hypothesis.title,
    roadChanges: hypothesis.roadChanges,
    roadStateOverrides: overrides,
    metrics: analysis.metrics,
    droneWeightedCoveragePercent: analysis.drone.weightedCoveragePercent,
    topClearanceRoadId: analysis.clearancePriorities[0]?.road.id ?? null,
    topClearanceScore: analysis.clearancePriorities[0]?.score ?? null,
    exactAssignmentCandidates,
    verdict,
  };
  return { evaluation, analysis };
}

function evaluateQuestion(
  question: NankaiReasoningQuestion,
  worlds: Map<NankaiReasoningHypothesisId, NankaiWorldEvaluation>,
): NankaiQuestionEvaluation {
  const yes = worlds.get(question.ifYesHypothesisId);
  const no = worlds.get(question.ifNoHypothesisId);
  if (!yes || !no) throw new Error("Question references a missing Nankai world");
  const supplyCoverageSwingPoints = Number(Math.abs(yes.metrics.supplyCoveragePercent - no.metrics.supplyCoveragePercent).toFixed(1));
  const criticalPowerGapSwing = Math.abs(yes.metrics.powerCriticalGaps - no.metrics.powerCriticalGaps);
  const groundTransferSwing = Math.abs(yes.metrics.medicalCasesPlanned - no.metrics.medicalCasesPlanned);
  const airRequestSwing = Math.abs(yes.metrics.medicalAirRequests - no.metrics.medicalAirRequests);
  const inaccessibleLocationSwing = Math.abs(yes.metrics.inaccessibleLocations - no.metrics.inaccessibleLocations);
  const droneCoverageSwingPoints = Number(Math.abs(yes.droneWeightedCoveragePercent - no.droneWeightedCoveragePercent).toFixed(1));
  const deterministicValueScore = Number((
    supplyCoverageSwingPoints * 2
    + criticalPowerGapSwing * 140
    + groundTransferSwing * 110
    + airRequestSwing * 75
    + inaccessibleLocationSwing * 60
    + droneCoverageSwingPoints
  ).toFixed(1));
  return {
    ...question,
    supplyCoverageSwingPoints,
    criticalPowerGapSwing,
    groundTransferSwing,
    airRequestSwing,
    inaccessibleLocationSwing,
    droneCoverageSwingPoints,
    deterministicValueScore,
    actionGate: "human_authority_required",
  };
}

export function adjudicateNankaiReasoning(
  proposal: NankaiReasoningProposal,
  phase: NankaiPhase = "first_6_hours",
): NankaiReasoningAdjudication {
  if (!validateNankaiReasoningProposal(proposal)) throw new Error("Invalid Nankai reasoning proposal");
  const solvedWorlds = proposal.hypotheses.map((hypothesis) => solveWorld(hypothesis, phase));
  const evaluations = solvedWorlds.map((world) => world.evaluation);
  const byId = new Map(evaluations.map((evaluation) => [evaluation.hypothesisId, evaluation]));
  const rankedQuestions = proposal.questions
    .map((question) => evaluateQuestion(question, byId))
    .sort((left, right) => right.deterministicValueScore - left.deterministicValueScore || left.id.localeCompare(right.id));
  const highestValueQuestion = rankedQuestions[0];
  if (!highestValueQuestion) throw new Error("Nankai reasoning proposal did not contain an evidence question");
  const analyses = solvedWorlds.map((world) => world.analysis);
  return {
    actionGate: "human_authority_required",
    modelRecommendationStatus: "withheld_pending_evidence",
    modelRecommendedHypothesisId: proposal.recommendedHypothesisId,
    evaluations,
    rankedQuestions,
    highestValueQuestion,
    disagreement: {
      distinctWorlds: new Set(proposal.hypotheses.map(worldFingerprint)).size,
      supplyCoverageRangePoints: numericRange(evaluations.map((world) => world.metrics.supplyCoveragePercent)),
      criticalPowerGapRange: numericRange(evaluations.map((world) => world.metrics.powerCriticalGaps)),
      groundTransferRange: numericRange(evaluations.map((world) => world.metrics.medicalCasesPlanned)),
      airRequestRange: numericRange(evaluations.map((world) => world.metrics.medicalAirRequests)),
      inaccessibleLocationRange: numericRange(evaluations.map((world) => world.metrics.inaccessibleLocations)),
    },
    computationalEvidence: {
      worldsReplanned: evaluations.length,
      exactAssignmentCandidates: evaluations.reduce((sum, world) => sum + world.exactAssignmentCandidates, 0),
      routeSearches: analyses.reduce((sum, analysis) => sum + analysis.evidence.roadDijkstraRuns, 0),
      minCostFlowAugmentations: analyses.reduce((sum, analysis) => sum + analysis.evidence.minCostFlowAugmentations, 0),
      roadClearanceCounterfactuals: analyses.reduce((sum, analysis) => sum + analysis.evidence.clearanceCounterfactuals, 0),
      deterministic: true,
    },
    advisoryConclusion: `Do not select a field state from model reasoning alone. First obtain: ${highestValueQuestion.evidenceToRequest}`,
  };
}

export function nankaiReasoningContext(phase: NankaiPhase) {
  const baseline = analyzeNankaiResponse(phase);
  return {
    schemaVersion: NANKAI_REASONING_SCHEMA_VERSION,
    phase,
    supportedRoads: NANKAI_ROADS.map((road) => ({
      id: road.id,
      label: road.label,
      endpoints: [road.from, road.to],
      baselineState: road.stateByPhase[phase],
    })),
    supportedLocations: NANKAI_NODES.map((node) => ({ id: node.id, label: node.label, kind: node.kind })),
    baselineMetrics: baseline.metrics,
    boundaries: [
      "All facilities, cases, assets, inventories, roads and reports are synthetic.",
      "The model may propose only bounded road-state worlds using supplied IDs.",
      "Deterministic software, not the model, calculates supply, power, medical, drone and clearance consequences.",
      "No hypothesis can authorize road use, triage, hospital acceptance, dispatch, switching, launch or aircraft tasking.",
    ],
  };
}

export async function buildNankaiCouncilEvidence(
  analysis: NankaiResponseAnalysis,
  proposal: NankaiReasoningProposal,
  adjudication: NankaiReasoningAdjudication,
  mode: "gpt-5.6-sol" | "demo-fallback",
) {
  if (!validateNankaiReasoningProposal(proposal)) throw new Error("Cannot export an invalid Nankai reasoning proposal");
  const responseEvidence = await buildNankaiEvidence(analysis);
  const evidence = {
    schemaVersion: NANKAI_REASONING_SCHEMA_VERSION,
    model: "gpt-5.6-sol",
    mode,
    phase: analysis.phase,
    proposal,
    adjudication,
    inspectedHypothesisId: proposal.hypotheses.find((hypothesis) => worldFingerprint(hypothesis) === Object.entries(analysis.roadStateOverrides).map(([roadId, state]) => `${roadId}:${state}`).sort().join("|"))?.id ?? null,
    responseEvidence,
    gates: {
      modelRecommendation: "withheld_pending_evidence",
      worldAutoApplication: "prohibited",
      fieldOperation: "blocked",
      actionAuthority: "human_required",
    },
    boundary: "Synthetic council evidence only. It does not prove source truth, diagnose a road, triage a patient, authorize dispatch, switch power, launch a drone, or task an aircraft.",
  };
  return { ...evidence, packageDigest: `sha256:${await sha256Hex(evidence)}` };
}
