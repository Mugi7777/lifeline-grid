import assert from "node:assert/strict";
import test from "node:test";
import {
  adjudicateRegionalReasoning,
  fallbackRegionalReasoning,
  validateRegionalReasoningProposal,
} from "../lib/regional-reasoning.ts";

test("the fallback reasoning council satisfies the strict bounded contract", () => {
  const proposal = fallbackRegionalReasoning();
  assert.equal(validateRegionalReasoningProposal(proposal), true);
  assert.deepEqual(proposal.hypotheses.map((item) => item.id), ["h1", "h2", "h3"]);
  assert.deepEqual(new Set(proposal.hypotheses.map((item) => item.state)), new Set(["closed", "weight_limited", "open"]));
});

test("the deterministic council tests every hypothesis and withholds autonomous action", () => {
  const proposal = fallbackRegionalReasoning();
  const result = adjudicateRegionalReasoning(proposal, 120);
  assert.equal(result.actionGate, "human_authority_required");
  assert.equal(result.modelRecommendationStatus, "withheld_pending_evidence");
  assert.equal(result.evaluations.length, 3);
  assert.equal(result.computationalEvidence.hypothesesEvaluated, 3);
  assert.equal(result.computationalEvidence.stressScenarios, 192);
  assert.equal(result.computationalEvidence.nMinusOneRoadCases, 36);
  assert.equal(result.highestValueQuestion.id, "q1");
  assert.equal(result.highestValueQuestion.safetyGate, true);
});

test("counterfactual road states expose the exact access swing behind the evidence question", () => {
  const result = adjudicateRegionalReasoning(fallbackRegionalReasoning(), 120);
  const closure = result.evaluations.find((item) => item.hypothesisId === "h1");
  const open = result.evaluations.find((item) => item.hypothesisId === "h3");
  assert.equal(closure?.householdsAffected, 64);
  assert.equal(closure?.vulnerableResidentsAffected, 32);
  assert.equal(open?.householdsAffected, 0);
  assert.equal(open?.vulnerableResidentsAffected, 0);
  assert.equal(result.highestValueQuestion.accessSwingHouseholds, 64);
  assert.equal(result.highestValueQuestion.vulnerableSwingResidents, 32);
});

test("unsupported roads and malformed weight restrictions fail closed", () => {
  const unknownRoad = structuredClone(fallbackRegionalReasoning());
  unknownRoad.hypotheses[0].roadSegmentId = "invented-road";
  assert.equal(validateRegionalReasoningProposal(unknownRoad), false);

  const malformedRestriction = structuredClone(fallbackRegionalReasoning());
  malformedRestriction.hypotheses[1].weightLimitT = 0;
  assert.equal(validateRegionalReasoningProposal(malformedRestriction), false);
});

test("reasoning adjudication is deterministic for audit replay", () => {
  const proposal = fallbackRegionalReasoning();
  assert.deepEqual(adjudicateRegionalReasoning(proposal, 120), adjudicateRegionalReasoning(proposal, 120));
});
