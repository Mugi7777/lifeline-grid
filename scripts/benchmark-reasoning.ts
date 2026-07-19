import { performance } from "node:perf_hooks";
import { adjudicateRegionalReasoning, fallbackRegionalReasoning } from "../lib/regional-reasoning.ts";

const iterations = Number(process.argv[2] ?? 25);
if (!Number.isInteger(iterations) || iterations < 5 || iterations > 100) {
  throw new Error("Reasoning benchmark iterations must be an integer between 5 and 100");
}

const proposal = fallbackRegionalReasoning();
for (let index = 0; index < 3; index += 1) adjudicateRegionalReasoning(proposal, 120);

const durations: number[] = [];
let last = adjudicateRegionalReasoning(proposal, 120);
for (let index = 0; index < iterations; index += 1) {
  const startedAt = performance.now();
  last = adjudicateRegionalReasoning(proposal, 120);
  durations.push(performance.now() - startedAt);
}
durations.sort((left, right) => left - right);
const percentile = (value: number) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];

console.log(JSON.stringify({
  fixture: "Mizunoki three-hypothesis reasoning council · synthetic",
  iterations,
  latencyMs: {
    min: Number(durations[0].toFixed(2)),
    p50: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    max: Number(durations.at(-1)!.toFixed(2)),
  },
  evidence: last.computationalEvidence,
  highestValueQuestion: {
    id: last.highestValueQuestion.id,
    householdsSwing: last.highestValueQuestion.accessSwingHouseholds,
    vulnerableResidentsSwing: last.highestValueQuestion.vulnerableSwingResidents,
    safetyGate: last.highestValueQuestion.safetyGate,
  },
  boundary: "Deterministic kernel only; excludes OpenAI API network latency and is not a production SLO.",
}, null, 2));
