"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { buildRegionalScaleProof, type ScaleNodeCount } from "@/lib/regional-scale";
import RegionalScaleMap from "./regional-scale-map";

function signed(value: number, suffix = "") {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

export default function RegionalScaleLab() {
  const [nodeCount, setNodeCount] = useState<ScaleNodeCount>(2048);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [measuredMs, setMeasuredMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const proof = useMemo(() => buildRegionalScaleProof(nodeCount), [nodeCount]);
  const selectedImpact = proof.rankedCorridors.find((impact) => impact.edge.id === selectedEdgeId)
    ?? proof.rankedCorridors[0];

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const startedAt = window.performance.now();
      buildRegionalScaleProof(nodeCount);
      const duration = Number((window.performance.now() - startedAt).toFixed(1));
      if (active) setMeasuredMs(duration);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [nodeCount]);

  function changeScale(nextNodeCount: ScaleNodeCount) {
    if (nextNodeCount === nodeCount) return;
    setSelectedEdgeId(null);
    setMeasuredMs(null);
    startTransition(() => setNodeCount(nextNodeCount));
  }

  function exportScaleProof() {
    const payload = {
      schemaVersion: "lifeline-grid.scale-proof.v1",
      boundary: "synthetic benchmark; not field capacity evidence",
      runtimeMeasurementMs: measuredMs,
      network: {
        region: proof.network.region,
        fingerprint: proof.network.fingerprint,
        zones: proof.network.nodes.length,
        links: proof.network.edges.length,
        hubs: proof.network.hubNodeIndexes.length,
      },
      baseline: proof.baseline,
      evidence: proof.evidence,
      rankedCorridors: proof.rankedCorridors.map((impact, index) => ({
        rank: index + 1,
        edge: impact.edge,
        metrics: impact.metrics,
        householdCoverageDelta: impact.householdCoverageDelta,
        vulnerableCoverageDelta: impact.vulnerableCoverageDelta,
        householdsLost: impact.householdsLost,
        vulnerableResidentsLost: impact.vulnerableResidentsLost,
        averageAddedMinutes: impact.averageAddedMinutes,
        affectedZoneCount: impact.affectedNodeIds.length,
        score: impact.score,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifeline-grid-scale-proof-${nodeCount}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={`scale-lab-panel ${isPending ? "is-computing" : ""}`} aria-labelledby="scale-lab-title">
      <div className="scale-lab-heading">
        <div>
          <p className="panel-kicker">REGIONAL SCALE PROOF · MEASURED ON THIS RUNTIME</p>
          <h2 id="scale-lab-title">See the engine—not a performance claim.</h2>
          <p>A deterministic sparse graph is generated, every link is screened, and the 64 highest-flow failure candidates are replayed exactly. The map samples geometry for mobile rendering; every zone and link remains in the computation.</p>
        </div>
        <div className="scale-selector" aria-label="Synthetic benchmark size">
          {([512, 2048] as const).map((size) => (
            <button className={nodeCount === size ? "active" : ""} type="button" onClick={() => changeScale(size)} key={size}>
              <b>{size.toLocaleString()}</b><small>zones</small>
            </button>
          ))}
        </div>
      </div>

      <div className="scale-proof-strip" aria-live="polite">
        <span><small>Analyzed graph</small><b>{proof.network.nodes.length.toLocaleString()}</b><em>zones</em></span>
        <span><small>Sparse links</small><b>{proof.network.edges.length.toLocaleString()}</b><em>screened</em></span>
        <span><small>Exact replays</small><b>{proof.evidence.exactFailuresEvaluated}</b><em>closures</em></span>
        <span><small>Graph relaxations</small><b>{proof.evidence.graphRelaxations.toLocaleString()}</b><em>auditable</em></span>
        <span className="latency-proof"><small>Measured compute</small><b>{measuredMs ?? "…"}</b><em>{measuredMs === null ? "measuring locally" : "ms · this runtime"}</em></span>
      </div>

      <div className="scale-lab-workspace">
        <article className="scale-map-card">
          <RegionalScaleMap proof={proof} selectedImpact={selectedImpact} onCorridorSelect={setSelectedEdgeId} />
        </article>
        <aside className="scale-impact-rail">
          <div className="scale-impact-heading">
            <p className="panel-kicker">COUNTERFACTUAL CORRIDOR RANKING</p>
            <h3>Break a high-flow link</h3>
            <p>Ranking combines service exposure, vulnerable residents, detour cost and modeled failure probability.</p>
          </div>
          <div className="scale-corridor-list">
            {proof.rankedCorridors.slice(0, 5).map((impact, index) => (
              <button className={impact.edge.id === selectedImpact.edge.id ? "selected" : ""} type="button" onClick={() => setSelectedEdgeId(impact.edge.id)} key={impact.edge.id}>
                <i>#{index + 1}</i>
                <span><b>{impact.edge.id}</b><small>Grade {impact.edge.conditionGrade} · {(impact.edge.annualFailureProbability * 100).toFixed(1)}% modeled risk</small></span>
                <em>{impact.householdsLost > 0 ? `${impact.householdsLost.toLocaleString()} hh` : impact.averageAddedMinutes > 0 ? `+${impact.averageAddedMinutes} min` : "absorbed"}</em>
              </button>
            ))}
          </div>
          <div className="scale-before-after">
            <article>
              <span>BASELINE</span><b>{proof.baseline.householdCoveragePercent}%</b><small>household access · p95 {proof.baseline.p95AccessMinutes} min</small>
            </article>
            <i>→</i>
            <article className={selectedImpact.householdsLost > 0 ? "impact" : "resilient"}>
              <span>LINK REMOVED</span><b>{selectedImpact.metrics.householdCoveragePercent}%</b><small>{signed(selectedImpact.householdCoverageDelta, "%")} access · {selectedImpact.affectedNodeIds.length.toLocaleString()} zones changed</small>
            </article>
          </div>
          <div className="scale-impact-facts">
            <span><b>{selectedImpact.householdsLost.toLocaleString()}</b><small>households crossing the 90-minute floor</small></span>
            <span><b>{selectedImpact.vulnerableResidentsLost.toLocaleString()}</b><small>priority residents crossing the floor</small></span>
            <span><b>{selectedImpact.averageAddedMinutes}</b><small>mean added minutes among affected zones</small></span>
          </div>
          <footer>
            <div><code>{proof.network.fingerprint}</code><span>{proof.evidence.dijkstraRuns} reproducible Dijkstra runs · no server or model required</span></div>
            <button type="button" onClick={exportScaleProof}>Export proof JSON</button>
          </footer>
        </aside>
      </div>
      <p className="scale-lab-boundary">Synthetic benchmark, not field capacity evidence. Production claims require licensed authoritative roads, representative workloads, controlled hardware, p50/p95/p99 latency, load tests, and independent replay.</p>
    </section>
  );
}
