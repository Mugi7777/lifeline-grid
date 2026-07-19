import test from "node:test";
import assert from "node:assert/strict";
import { buildRegionalScaleProof, buildScaleNetwork } from "../lib/regional-scale.ts";

test("the scale engine builds a bounded sparse 2,048-zone graph", () => {
  const network = buildScaleNetwork(2048);
  assert.equal(network.nodes.length, 2048);
  assert.equal(network.edges.length, 5481);
  assert.equal(network.hubNodeIndexes.length, 3);
  assert.equal(network.fingerprint, "fnv1a:493cc02c");
  for (const edge of network.edges) {
    assert.ok(edge.from >= 0 && edge.from < network.nodes.length);
    assert.ok(edge.to >= 0 && edge.to < network.nodes.length);
    assert.ok(edge.travelMinutes > 0 && Number.isFinite(edge.travelMinutes));
    assert.ok(edge.annualFailureProbability > 0 && edge.annualFailureProbability < 1);
  }
});

test("flow screening is followed by exact counterfactual closure replay", () => {
  const proof = buildRegionalScaleProof(2048);
  assert.equal(proof.evidence.edgesScreened, proof.network.edges.length);
  assert.equal(proof.evidence.exactFailuresEvaluated, 64);
  assert.equal(proof.evidence.dijkstraRuns, 65);
  assert.ok(proof.evidence.graphRelaxations > proof.network.edges.length * 2);
  assert.equal(proof.baseline.householdCoveragePercent, 100);
  assert.equal(proof.rankedCorridors.length, 8);
  assert.ok(proof.rankedCorridors[0].householdsLost > 0);
  assert.ok(proof.rankedCorridors[0].vulnerableResidentsLost > 0);
  assert.ok(proof.rankedCorridors[0].metrics.householdCoveragePercent <= proof.baseline.householdCoveragePercent);
  assert.ok(proof.rankedCorridors[0].affectedNodeIds.length > 0);
});

test("scale evidence is deterministic and never includes measured latency", () => {
  const first = buildRegionalScaleProof(512);
  const second = buildRegionalScaleProof(512);
  assert.deepEqual(first, second);
  assert.equal(first.network.fingerprint, "fnv1a:e5a30cea");
  assert.equal("measuredMs" in first.evidence, false);
});
