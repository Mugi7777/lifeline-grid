import assert from "node:assert/strict";
import test from "node:test";
import { analyzeNankaiResponse } from "../lib/nankai-response.ts";
import {
  adjudicateNankaiReasoning,
  buildNankaiCouncilEvidence,
  fallbackNankaiReasoning,
  validateNankaiReasoningProposal,
} from "../lib/nankai-reasoning.ts";

test("the fallback Sol council satisfies the strict three-world contract", () => {
  const proposal = fallbackNankaiReasoning();
  assert.equal(validateNankaiReasoningProposal(proposal), true);
  assert.deepEqual(proposal.hypotheses.map((hypothesis) => hypothesis.id), ["h1", "h2", "h3"]);
  assert.equal(new Set(proposal.hypotheses.map((hypothesis) => hypothesis.roadChanges.map((change) => `${change.roadId}:${change.state}`).sort().join("|"))).size, 3);
});

test("Sol worlds are independently replanned across every response mission", () => {
  const adjudication = adjudicateNankaiReasoning(fallbackNankaiReasoning(), "first_6_hours");
  assert.equal(adjudication.actionGate, "human_authority_required");
  assert.equal(adjudication.modelRecommendationStatus, "withheld_pending_evidence");
  assert.equal(adjudication.computationalEvidence.worldsReplanned, 3);
  assert.equal(adjudication.computationalEvidence.exactAssignmentCandidates, 615);
  assert.equal(adjudication.computationalEvidence.routeSearches, 27);
  assert.equal(adjudication.computationalEvidence.minCostFlowAugmentations, 39);
  assert.equal(adjudication.computationalEvidence.roadClearanceCounterfactuals, 22);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.supplyCoveragePercent), [50.2, 69.3, 81]);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.powerCriticalGaps), [1, 1, 0]);
  assert.deepEqual(adjudication.evaluations.map((world) => world.metrics.medicalCasesPlanned), [0, 2, 2]);
});

test("the deterministic kernel ranks the authority evidence with the largest mission swing", () => {
  const adjudication = adjudicateNankaiReasoning(fallbackNankaiReasoning(), "first_6_hours");
  assert.equal(adjudication.highestValueQuestion.id, "q1");
  assert.equal(adjudication.highestValueQuestion.evidenceClass, "road_authority_status");
  assert.equal(adjudication.highestValueQuestion.supplyCoverageSwingPoints, 30.8);
  assert.equal(adjudication.highestValueQuestion.criticalPowerGapSwing, 1);
  assert.equal(adjudication.highestValueQuestion.groundTransferSwing, 2);
  assert.equal(adjudication.highestValueQuestion.airRequestSwing, 3);
  assert.equal(adjudication.highestValueQuestion.inaccessibleLocationSwing, 2);
  assert.equal(adjudication.highestValueQuestion.deterministicValueScore, 770.1);
});

test("every Sol world remains fail-closed for blocked and unknown roads", () => {
  const proposal = fallbackNankaiReasoning();
  for (const hypothesis of proposal.hypotheses) {
    const overrides = Object.fromEntries(hypothesis.roadChanges.map((change) => [change.roadId, change.state]));
    const analysis = analyzeNankaiResponse("first_6_hours", null, overrides);
    const unusable = new Set(analysis.roads.filter((road) => road.activeState === "blocked" || road.activeState === "unknown").map((road) => road.id));
    const usedRoadIds = [
      ...analysis.supply.commodities.flatMap((commodity) => commodity.assignments.flatMap((assignment) => assignment.route.roadIds)),
      ...analysis.power.assignments.flatMap((assignment) => assignment.route.roadIds),
      ...analysis.medical.groundAssignments.flatMap((assignment) => assignment.roadIds),
    ];
    assert.equal(usedRoadIds.some((roadId) => unusable.has(roadId)), false);
  }
});

test("invented roads and duplicate worlds fail the reasoning boundary", () => {
  const invented = structuredClone(fallbackNankaiReasoning());
  invented.hypotheses[0].roadChanges[0].roadId = "invented-coastal-road";
  assert.equal(validateNankaiReasoningProposal(invented), false);

  const duplicate = structuredClone(fallbackNankaiReasoning());
  duplicate.hypotheses[1].roadChanges = structuredClone(duplicate.hypotheses[0].roadChanges);
  assert.equal(validateNankaiReasoningProposal(duplicate), false);
});

test("Nankai reasoning adjudication is deterministic for audit replay", () => {
  const proposal = fallbackNankaiReasoning();
  assert.deepEqual(
    adjudicateNankaiReasoning(proposal, "first_6_hours"),
    adjudicateNankaiReasoning(structuredClone(proposal), "first_6_hours"),
  );
});

test("the council evidence package binds the model worlds to the inspected response state", async () => {
  const proposal = fallbackNankaiReasoning();
  const adjudication = adjudicateNankaiReasoning(proposal, "first_6_hours");
  const inspected = adjudication.evaluations[2];
  const analysis = analyzeNankaiResponse("first_6_hours", null, inspected.roadStateOverrides);
  const first = await buildNankaiCouncilEvidence(analysis, proposal, adjudication, "demo-fallback");
  const second = await buildNankaiCouncilEvidence(analysis, structuredClone(proposal), structuredClone(adjudication), "demo-fallback");
  assert.deepEqual(first, second);
  assert.equal(first.inspectedHypothesisId, "h3");
  assert.equal(first.gates.worldAutoApplication, "prohibited");
  assert.match(first.packageDigest, /^sha256:[0-9a-f]{64}$/);
});
