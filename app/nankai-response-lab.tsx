"use client";

import { useMemo, useState } from "react";
import {
  NANKAI_PHASES,
  analyzeNankaiResponse,
  buildNankaiEvidence,
  type NankaiCommodity,
  type NankaiPhase,
} from "@/lib/nankai-response";
import NankaiResponseMap from "./nankai-response-map";

const COMMODITY_LABELS: Record<NankaiCommodity, { label: string; unit: string }> = {
  water_100l: { label: "Water", unit: "×100 L" },
  meals_10: { label: "Meals", unit: "×10" },
  medicine_kits: { label: "Medicine", unit: "kits" },
};

export default function NankaiResponseLab() {
  const [phase, setPhase] = useState<NankaiPhase>("first_6_hours");
  const [interventionRoadId, setInterventionRoadId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"ready" | "working" | "done">("ready");
  const baseline = useMemo(() => analyzeNankaiResponse(phase), [phase]);
  const analysis = useMemo(() => interventionRoadId ? analyzeNankaiResponse(phase, interventionRoadId) : baseline, [baseline, interventionRoadId, phase]);
  const nodeLabel = useMemo(() => new Map(analysis.nodes.map((node) => [node.id, node.label])), [analysis.nodes]);
  const activePhase = NANKAI_PHASES.find((item) => item.id === phase)!;
  const selectedIntervention = analysis.roads.find((road) => road.id === interventionRoadId) ?? null;
  const candidatesEvaluated = analysis.evidence.exactPowerAssignments + analysis.evidence.exactMedicalAssignments + analysis.evidence.exactDroneAssignments;

  function changePhase(nextPhase: NankaiPhase) {
    setPhase(nextPhase);
    setInterventionRoadId(null);
  }

  async function downloadEvidence() {
    setExportState("working");
    const evidence = await buildNankaiEvidence(analysis);
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lifeline-nankai-${phase}-${interventionRoadId ?? "no-intervention"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportState("done");
    window.setTimeout(() => setExportState("ready"), 1600);
  }

  return (
    <section className="panel nankai-lab-panel" aria-labelledby="nankai-lab-title">
      <div className="nankai-lab-heading">
        <div>
          <p className="panel-kicker">NANKAI TROUGH 72H RESPONSE LAB × MULTI-MODAL ORCHESTRATION</p>
          <h2 id="nankai-lab-title">One damaged network. Supplies, power, patient transfer and drone search compete for time.</h2>
          <p>A synthetic Kochi coastal exercise joins fail-closed roads, push supplies, V2L and generators, deadline-bound hospital transfers, drone search grids and road-clearance counterfactuals in one reproducible decision state.</p>
        </div>
        <span className="nankai-authority-badge"><i />AUTO PLAN · HUMAN AUTHORITY REQUIRED</span>
      </div>

      <div className="nankai-phase-bar">
        <div role="group" aria-label="Nankai response phase">
          {NANKAI_PHASES.map((item) => <button className={phase === item.id ? "active" : ""} type="button" key={item.id} onClick={() => changePhase(item.id)}><b>{item.label}</b><small>{item.short}</small></button>)}
        </div>
        <article className={selectedIntervention ? "active" : "idle"}>
          <span>{selectedIntervention ? "MODELED ROAD-CLEARANCE ACTION" : "NO ROAD-CLEARANCE ACTION"}</span>
          <b>{selectedIntervention?.label ?? "Select a ranked corridor or run the top counterfactual"}</b>
          <small>{selectedIntervention ? `Supply ${baseline.metrics.supplyCoveragePercent}% → ${analysis.metrics.supplyCoveragePercent}% · critical power gaps ${baseline.metrics.powerCriticalGaps} → ${analysis.metrics.powerCriticalGaps}` : "No physical road state is changed; this is a synthetic comparison."}</small>
          {baseline.clearancePriorities[0] ? <button type="button" onClick={() => setInterventionRoadId(interventionRoadId ? null : baseline.clearancePriorities[0].road.id)}>{interventionRoadId ? "Remove intervention" : "Run top clearance simulation"}</button> : <em>NO BLOCKED / UNKNOWN CORRIDOR</em>}
        </article>
      </div>

      <div className="nankai-metric-strip" aria-label="Nankai response metrics" aria-live="polite">
        <span><b>{analysis.metrics.supplyCoveragePercent}%</b><small>weighted supply coverage</small><em>{interventionRoadId ? `${analysis.metrics.supplyCoveragePercent - baseline.metrics.supplyCoveragePercent >= 0 ? "+" : ""}${(analysis.metrics.supplyCoveragePercent - baseline.metrics.supplyCoveragePercent).toFixed(1)} pt` : activePhase.label}</em></span>
        <span className={analysis.metrics.powerCriticalGaps ? "risk" : "safe"}><b>{analysis.metrics.powerCriticalGaps}</b><small>critical power gaps</small><em>{analysis.power.candidatesEvaluated} exact assignments</em></span>
        <span><b>{analysis.metrics.medicalCasesPlanned}/5</b><small>ground transfer plans</small><em>{analysis.metrics.medicalAirRequests} air requests</em></span>
        <span><b>{analysis.metrics.droneZonesCovered}/5</b><small>search grids assigned</small><em>{analysis.drone.weightedCoveragePercent}% weighted</em></span>
        <span className={analysis.metrics.inaccessibleLocations ? "risk" : "safe"}><b>{analysis.metrics.inaccessibleLocations}</b><small>ground-inaccessible nodes</small><em>unknown fails closed</em></span>
        <span><b>{candidatesEvaluated}</b><small>exact assignment candidates</small><em>{analysis.evidence.roadDijkstraRuns} Dijkstra runs</em></span>
      </div>

      <div className="nankai-workspace">
        <article className="nankai-map-card">
          <header><div><span>SHARED RESPONSE STATE</span><b>{analysis.scenarioLabel}</b></div><em>{activePhase.label.toUpperCase()} · SYNTHETIC</em></header>
          <NankaiResponseMap analysis={analysis} onInterventionSelect={setInterventionRoadId} />
        </article>

        <aside className="nankai-clearance-rail">
          <header><div><span>ROAD-CLEARANCE COUNTERFACTUALS</span><b>Which single corridor restores the most life-support access?</b></div><em>{analysis.evidence.clearanceCounterfactuals} EXACT REPLAYS</em></header>
          <div className="nankai-clearance-list">
            {baseline.clearancePriorities.slice(0, 6).map((item) => (
              <button className={interventionRoadId === item.road.id ? "selected" : ""} type="button" key={item.road.id} onClick={() => setInterventionRoadId(interventionRoadId === item.road.id ? null : item.road.id)}>
                <i>{item.rank}</i><span><b>{item.road.label}</b><small>{item.baseState} · {item.road.clearanceMinutes} min clearance</small></span><em>{item.score}</em>
                <div><span><b>+{item.restoredServiceSites}</b><small>service sites</small></span><span><b>+{item.restoredMedicalCases}</b><small>ground cases</small></span><span><b>+{item.restoredCriticalSites}</b><small>critical power</small></span></div>
              </button>
            ))}
            {baseline.clearancePriorities.length === 0 ? <div className="nankai-no-clearance"><b>No blocked or unknown corridor remains in this phase.</b><span>Degraded roads remain modeled with slower travel; no field safety claim is made.</span></div> : null}
          </div>
          <p>Ranking opens one modeled corridor at a time and replays reachability. It does not estimate structural work, crews, debris, aftershocks or legal priority.</p>
        </aside>
      </div>

      <div className="nankai-mission-grid">
        <article className="nankai-mission-card supply">
          <header><span>01 · PUSH SUPPLIES</span><em>MIN-COST FLOW</em></header>
          <h3>Allocate scarce stock to reachable priority sites.</h3>
          <div className="nankai-supply-bars">
            {analysis.supply.commodities.map((commodity) => <div key={commodity.commodity}><span><b>{COMMODITY_LABELS[commodity.commodity].label}</b><small>{commodity.deliveredUnits}/{commodity.requestedUnits} {COMMODITY_LABELS[commodity.commodity].unit}</small></span><i><em style={{ width: `${commodity.coveragePercent}%` }} /></i><strong>{commodity.coveragePercent}%</strong></div>)}
          </div>
          <footer>{analysis.supply.evidence.augmentations} augmentations · {analysis.supply.evidence.relaxations.toLocaleString()} residual relaxations</footer>
        </article>

        <article className="nankai-mission-card power">
          <header><span>02 · CRITICAL POWER</span><em>EXACT ASSIGNMENT</em></header>
          <h3>Stage V2L, mobile generation and battery energy.</h3>
          <div className="nankai-mission-list">
            {analysis.power.sites.map((site) => <div className={site.met ? "met" : "gap"} key={site.siteId}><i>{site.met ? "✓" : "!"}</i><span><b>{nodeLabel.get(site.siteId)}</b><small>{site.suppliedEnergyKwh}/{site.requiredEnergyKwh} kWh · {site.suppliedOutputKw}/{site.requiredOutputKw} kW</small></span><em>{site.met ? "MET" : "GAP"}</em></div>)}
          </div>
          <footer>{analysis.power.assignments.length} assets staged · no remote switching</footer>
        </article>

        <article className="nankai-mission-card medical">
          <header><span>03 · HOSPITAL TRANSFER</span><em>DEADLINE MATCHING</em></header>
          <h3>Build ground plans; escalate unreachable cases.</h3>
          <div className="nankai-mission-list compact">
            {analysis.medical.groundAssignments.map((assignment) => <div className="met" key={assignment.caseId}><i>→</i><span><b>{assignment.caseId}</b><small>{assignment.vehicleId} · {assignment.totalMinutes}/{assignment.deadlineMinutes} min</small></span><em>GROUND</em></div>)}
            {analysis.medical.unresolved.slice(0, 4).map((item) => <div className="gap" key={item.caseId}><i>!</i><span><b>{item.caseId}</b><small>{nodeLabel.get(item.originNodeId)} · {item.priority}</small></span><em>{item.recommendedMode === "air_coordination_request" ? "AIR REQUEST" : "WAITLIST"}</em></div>)}
          </div>
          <footer>Planning only · triage, acceptance and tasking require authorized humans</footer>
        </article>

        <article className="nankai-mission-card drone">
          <header><span>04 · DRONE SEARCH</span><em>VALUE MAXIMIZATION</em></header>
          <h3>Search inaccessible, uncertain, life-critical areas first.</h3>
          <div className="nankai-mission-list compact">
            {analysis.drone.assignments.map((assignment) => <div className="met" key={assignment.droneId}><i>⌁</i><span><b>{assignment.zoneId}</b><small>{assignment.droneId} · {assignment.totalMinutes} min</small></span><em>{assignment.score}</em></div>)}
            {analysis.drone.unsearchedZoneIds.map((zoneId) => <div className="gap" key={zoneId}><i>×</i><span><b>{zoneId}</b><small>Not covered by bounded fleet</small></span><em>OPEN</em></div>)}
          </div>
          <footer>No autonomous launch · weather, airspace and operator approval not modeled</footer>
        </article>
      </div>

      <div className="nankai-evidence-row">
        <article><span>COMPUTATIONAL EVIDENCE</span><b>{analysis.evidence.minCostFlowAugmentations} flow paths · {candidatesEvaluated} exact assignments</b><p>{analysis.evidence.roadRelaxations.toLocaleString()} road relaxations · {analysis.evidence.clearanceCounterfactuals} corridor counterfactuals · every accepted state deterministic</p></article>
        <article className="blocked"><span>CONSEQUENTIAL ACTION GATE</span><b>FIELD OPERATION BLOCKED</b><p>Vehicle dispatch, patient triage, hospital acceptance, road opening, drone launch and aircraft tasking remain outside the software authority.</p></article>
        <article className="nankai-export"><span>REPLAY PACKAGE</span><b>Versioned synthetic decision state</b><p>Road states, allocations, unresolved cases, algorithm counters, official basis and hard gates receive a canonical SHA-256 digest.</p><button type="button" onClick={() => void downloadEvidence()} disabled={exportState === "working"}>{exportState === "working" ? "Hashing evidence…" : exportState === "done" ? "Evidence downloaded" : "Export response evidence JSON"}</button></article>
      </div>

      <div className="nankai-official-basis">
        <span>PUBLIC-SOURCE DESIGN BASIS</span>
        <a href="https://www.bousai.go.jp/jishin/pdf/taisyohousin_gaiyou.pdf" target="_blank" rel="noreferrer">Cabinet Office 2026 emergency response policy ↗</a>
        <a href="https://www.bousai.go.jp/kohou/kouhoubousai/r07/113/news_15.html" target="_blank" rel="noreferrer">Kochi isolated-community drill ↗</a>
        <a href="https://www.bousai.go.jp/kohou/kouhoubousai/r07/113/news_02.html" target="_blank" rel="noreferrer">2025 maximum-class impact summary ↗</a>
      </div>
      <p className="nankai-boundary">Fictional tabletop values on a real basemap. This module does not use live earthquake, tsunami, road, hospital, patient, inventory, aircraft or airspace data. Straight connectors are not navigation geometry. Unknown roads are unusable by the planner; no optimization result is permission to act.</p>
    </section>
  );
}
