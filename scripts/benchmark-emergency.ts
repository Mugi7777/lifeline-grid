import { performance } from "node:perf_hooks";
import {
  adjudicateEmergencyReasoning,
  buildFallbackEmergencyReasoningProposal,
} from "../lib/emergency-reasoning.ts";
import { buildResilienceAnalysis } from "../lib/planner.ts";

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function measure<T>(operation: () => T) {
  const startedAt = performance.now();
  const value = operation();
  return { value, latencyMs: Number((performance.now() - startedAt).toFixed(2)) };
}

adjudicateEmergencyReasoning(buildFallbackEmergencyReasoningProposal());
const councilRuns = Array.from({ length: 5 }, () => measure(() => (
  adjudicateEmergencyReasoning(buildFallbackEmergencyReasoningProposal())
)));
const resilience = measure(() => buildResilienceAnalysis());
const representative = councilRuns[0].value;

console.log(JSON.stringify({
  runtime: process.version,
  emergencyCouncil: {
    runs: councilRuns.length,
    latencyMs: {
      min: Math.min(...councilRuns.map((run) => run.latencyMs)),
      p50: percentile(councilRuns.map((run) => run.latencyMs), 0.5),
      p95: percentile(councilRuns.map((run) => run.latencyMs), 0.95),
      max: Math.max(...councilRuns.map((run) => run.latencyMs)),
    },
    worldsReplanned: representative.computationalEvidence.worldsReplanned,
    exactAssignmentCandidates: representative.computationalEvidence.exactAssignmentCandidates,
    stressScenarios: representative.computationalEvidence.stressScenarios,
    planScenarioEvaluations: representative.computationalEvidence.planScenarioEvaluations,
    topEvidenceKey: representative.highestValueQuestion.evidenceKey,
  },
  nMinusOne: {
    latencyMs: resilience.latencyMs,
    contingencyCount: resilience.value.contingencyCount,
    candidateActions: resilience.value.candidateActions.length,
    baselineProtected: resilience.value.baseline.protectedContingencies,
    selectedProtected: resilience.value.selectedAction.protectedContingencies,
    selectedAction: resilience.value.selectedAction.label,
    planScenarioEvaluations: resilience.value.totalPlanScenarioEvaluations,
  },
  nonClaim: "Synthetic bounded-model runtime on this machine; not a production SLA or field-performance result.",
}, null, 2));
