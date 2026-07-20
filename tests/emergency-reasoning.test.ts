import assert from "node:assert/strict";
import test from "node:test";
import {
  adjudicateEmergencyReasoning,
  buildEmergencyCouncilEvidence,
  buildFallbackEmergencyReasoningProposal,
  validateEmergencyReasoningProposal,
} from "../lib/emergency-reasoning.ts";

test("the Emergency Power fallback satisfies the strict three-world Sol contract", () => {
  const proposal = buildFallbackEmergencyReasoningProposal();
  assert.equal(validateEmergencyReasoningProposal(proposal), true);
  assert.deepEqual(proposal.hypotheses.map((world) => world.id), ["h1", "h2", "h3"]);
  assert.equal(new Set(proposal.hypotheses.map((world) => JSON.stringify({
    blocked: world.blockedRouteIds,
    unavailable: world.unavailableVehicleIds,
    peak: world.waterPeakMode,
  }))).size, 3);
});

test("the deterministic kernel independently optimizes and stress-tests every Sol world", () => {
  const adjudication = adjudicateEmergencyReasoning(buildFallbackEmergencyReasoningProposal());
  assert.equal(adjudication.actionGate, "human_authority_required");
  assert.equal(adjudication.modelRecommendationStatus, "withheld_pending_evidence");
  assert.equal(adjudication.computationalEvidence.worldsReplanned, 3);
  assert.equal(adjudication.computationalEvidence.exactAssignmentCandidates, 144);
  assert.equal(adjudication.computationalEvidence.stressScenarios, 768);
  assert.equal(adjudication.computationalEvidence.planScenarioEvaluations, 36_864);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.criticalSiteHours), [12, 12, 8]);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.unservedCriticalKwh), [0, 0, 16.8]);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.fullMissionSuccessRate), [100, 100, 0]);
});

test("counterfactual value ranks pump evidence ahead of lower-impact facts", () => {
  const adjudication = adjudicateEmergencyReasoning(buildFallbackEmergencyReasoningProposal());
  assert.equal(adjudication.highestValueQuestion.id, "q1");
  assert.equal(adjudication.highestValueQuestion.evidenceKey, "need:water:peak");
  assert.equal(adjudication.highestValueQuestion.criticalEnergySwingKwh, 16.8);
  assert.equal(adjudication.highestValueQuestion.criticalCoverageSwingHours, 4);
  assert.equal(adjudication.highestValueQuestion.fullMissionSuccessSwingPoints, 100);
  assert.equal(adjudication.highestValueQuestion.valueScore, 2905);
});

test("unknown model state and duplicate worlds fail closed", () => {
  const unknownRoute = structuredClone(buildFallbackEmergencyReasoningProposal());
  unknownRoute.hypotheses[0].blockedRouteIds = ["invented-road"];
  assert.equal(validateEmergencyReasoningProposal(unknownRoute), false);

  const duplicate = structuredClone(buildFallbackEmergencyReasoningProposal());
  duplicate.hypotheses[1].blockedRouteIds = [...duplicate.hypotheses[0].blockedRouteIds];
  duplicate.hypotheses[1].unavailableVehicleIds = [...duplicate.hypotheses[0].unavailableVehicleIds];
  duplicate.hypotheses[1].waterPeakMode = duplicate.hypotheses[0].waterPeakMode;
  assert.equal(validateEmergencyReasoningProposal(duplicate), false);
});

test("the same council input produces an identical audit replay", () => {
  const proposal = buildFallbackEmergencyReasoningProposal();
  assert.deepEqual(
    adjudicateEmergencyReasoning(proposal),
    adjudicateEmergencyReasoning(structuredClone(proposal)),
  );
});

test("the council evidence binds model worlds to deterministic results without granting authority", async () => {
  const proposal = buildFallbackEmergencyReasoningProposal();
  const adjudication = adjudicateEmergencyReasoning(proposal);
  const first = await buildEmergencyCouncilEvidence(proposal, adjudication, "h2", "demo-fallback");
  const second = await buildEmergencyCouncilEvidence(structuredClone(proposal), structuredClone(adjudication), "h2", "demo-fallback");
  assert.deepEqual(first, second);
  assert.equal(first.gates.worldAutoApplication, "prohibited");
  assert.equal(first.gates.dispatch, "human_dual_control_required");
  assert.equal(first.gates.fieldOperation, "blocked");
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
});
