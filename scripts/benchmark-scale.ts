import { buildRegionalScaleProof, type ScaleNodeCount } from "../lib/regional-scale.ts";

function percentile(sorted: number[], quantile: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return Number(sorted[index].toFixed(2));
}

const requestedIterations = Number(process.argv[2] ?? 12);
const iterations = Number.isInteger(requestedIterations) && requestedIterations >= 3 && requestedIterations <= 100
  ? requestedIterations
  : 12;
const sizes: ScaleNodeCount[] = [512, 2048];
const results = [];

for (const nodeCount of sizes) {
  buildRegionalScaleProof(nodeCount);
  const samples: number[] = [];
  let lastProof = buildRegionalScaleProof(nodeCount);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const startedAt = performance.now();
    lastProof = buildRegionalScaleProof(nodeCount);
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  results.push({
    nodeCount,
    edgeCount: lastProof.network.edges.length,
    exactFailureReplays: lastProof.evidence.exactFailuresEvaluated,
    dijkstraRuns: lastProof.evidence.dijkstraRuns,
    graphRelaxations: lastProof.evidence.graphRelaxations,
    fingerprint: lastProof.network.fingerprint,
    latencyMs: {
      min: Number(samples[0].toFixed(2)),
      p50: percentile(samples, 0.5),
      p95: percentile(samples, 0.95),
      p99: percentile(samples, 0.99),
      max: Number(samples.at(-1)!.toFixed(2)),
    },
  });
}

console.log(JSON.stringify({
  benchmark: "Lifeline Grid deterministic regional scale proof",
  boundary: "single-process synthetic benchmark; not a production SLO or capacity claim",
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  iterations,
  results,
}, null, 2));
