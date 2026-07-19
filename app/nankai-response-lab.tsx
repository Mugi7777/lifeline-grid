"use client";

import { useMemo, useState } from "react";
import {
  NANKAI_PHASES,
  analyzeNankaiResponse,
  buildNankaiEvidence,
  type NankaiCommodity,
  type NankaiPhase,
} from "@/lib/nankai-response";
import type {
  NankaiReasoningAdjudication,
  NankaiReasoningHypothesisId,
  NankaiReasoningProposal,
} from "@/lib/nankai-reasoning";
import { buildNankaiCouncilEvidence } from "@/lib/nankai-reasoning";
import NankaiResponseMap from "./nankai-response-map";

const COMMODITY_LABELS: Record<NankaiCommodity, { label: string; unit: string }> = {
  water_100l: { label: "Water", unit: "×100 L" },
  meals_10: { label: "Meals", unit: "×10" },
  medicine_kits: { label: "Medicine", unit: "kits" },
};

const DEFAULT_COUNCIL_REPORT = "0–6 hour synthetic exercise. Coastal hospital staff report about two hours of backup power. A local responder says one light vehicle crossed part of the air-staging approach, while drone imagery appears to show vehicles turning around near standing water. Another message says the hospital-central corridor may allow escorted passage. Road-authority messages have not been reconciled.";

interface NankaiCouncilResponse {
  mode: "gpt-5.6-sol" | "demo-fallback";
  reason: "no-key" | "api-unavailable" | null;
  model: "gpt-5.6-sol";
  phase: NankaiPhase;
  proposal: NankaiReasoningProposal;
  adjudication: NankaiReasoningAdjudication;
  performance: {
    modelLatencyMs: number | null;
    kernelLatencyMs: number | null;
    totalLatencyMs: number;
    usage: { inputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null };
  };
}

export default function NankaiResponseLab() {
  const [phase, setPhase] = useState<NankaiPhase>("first_6_hours");
  const [interventionRoadId, setInterventionRoadId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"ready" | "working" | "done">("ready");
  const [councilReport, setCouncilReport] = useState(DEFAULT_COUNCIL_REPORT);
  const [councilWorking, setCouncilWorking] = useState(false);
  const [councilMessage, setCouncilMessage] = useState("Sol has not analyzed this synthetic situation report yet.");
  const [councilResult, setCouncilResult] = useState<NankaiCouncilResponse | null>(null);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<NankaiReasoningHypothesisId | null>(null);
  const selectedWorld = councilResult?.adjudication.evaluations.find((world) => world.hypothesisId === selectedHypothesisId) ?? null;
  const baseline = useMemo(() => analyzeNankaiResponse(phase, null, selectedWorld?.roadStateOverrides ?? {}), [phase, selectedWorld]);
  const analysis = useMemo(() => interventionRoadId ? analyzeNankaiResponse(phase, interventionRoadId, selectedWorld?.roadStateOverrides ?? {}) : baseline, [baseline, interventionRoadId, phase, selectedWorld]);
  const nodeLabel = useMemo(() => new Map(analysis.nodes.map((node) => [node.id, node.label])), [analysis.nodes]);
  const activePhase = NANKAI_PHASES.find((item) => item.id === phase)!;
  const selectedIntervention = analysis.roads.find((road) => road.id === interventionRoadId) ?? null;
  const candidatesEvaluated = analysis.evidence.exactPowerAssignments + analysis.evidence.exactMedicalAssignments + analysis.evidence.exactDroneAssignments;

  function changePhase(nextPhase: NankaiPhase) {
    setPhase(nextPhase);
    setInterventionRoadId(null);
    setCouncilResult(null);
    setSelectedHypothesisId(null);
    setCouncilMessage("Phase changed. Run Sol again so every world uses the selected response horizon.");
  }

  async function runCouncil() {
    setCouncilWorking(true);
    setCouncilMessage("Sol is constructing three bounded worlds; the deterministic kernel will then re-plan all four missions.");
    setSelectedHypothesisId(null);
    setInterventionRoadId(null);
    try {
      const response = await fetch("/api/nankai-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: councilReport, phase }),
      });
      if (!response.ok) throw new Error("Reasoning request failed");
      const payload = await response.json() as NankaiCouncilResponse;
      setCouncilResult(payload);
      setCouncilMessage(payload.mode === "gpt-5.6-sol"
        ? "GPT-5.6 Sol ran live. No world was applied; inspect one only as a synthetic comparison."
        : payload.reason === "no-key"
          ? "Verified fallback is shown because no live API key is available. The same strict contract and deterministic adjudication ran."
          : "Verified fallback is shown because live Sol was unavailable. The deterministic adjudication still ran.");
    } catch {
      setCouncilMessage("The reasoning council could not be verified. No model world was applied and the baseline remains unchanged.");
    } finally {
      setCouncilWorking(false);
    }
  }

  async function downloadEvidence() {
    setExportState("working");
    const evidence = councilResult
      ? await buildNankaiCouncilEvidence(analysis, councilResult.proposal, councilResult.adjudication, councilResult.mode)
      : await buildNankaiEvidence(analysis);
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

      <section className="nankai-sol-council" aria-labelledby="nankai-sol-title">
        <header>
          <div><span>GPT-5.6 SOL × THREE-WORLD DISASTER REASONING</span><h3 id="nankai-sol-title">Do not collapse conflicting reports into one confident answer.</h3><p>Sol proposes three falsifiable network worlds and counterevidence. The deterministic engine re-plans supply, power, hospital transfer and drone search in every world, then ranks the one fact with the largest mission consequence.</p></div>
          <em className={councilWorking ? "running" : councilResult?.mode ?? "idle"}>{councilWorking ? "SOL REASONING" : councilResult?.mode === "gpt-5.6-sol" ? "SOL LIVE" : councilResult ? "VERIFIED FALLBACK" : "READY"}</em>
        </header>
        <div className="nankai-sol-input">
          <label htmlFor="nankai-council-report"><span>Conflicting synthetic situation reports</span><textarea id="nankai-council-report" rows={4} maxLength={6000} value={councilReport} onChange={(event) => setCouncilReport(event.target.value)} /></label>
          <button type="button" onClick={() => void runCouncil()} disabled={councilWorking || councilReport.trim().length === 0}><b>{councilWorking ? "Re-planning three worlds…" : "Run Sol Disaster Council"}</b><small>Hypothesize → counterevidence → exact re-plan → rank one fact</small></button>
        </div>
        <p className="nankai-sol-message" aria-live="polite">{councilMessage}</p>

        {councilResult ? (
          <div className="nankai-sol-result">
            <div className="nankai-sol-summary">
              <div><span>SITUATION SYNTHESIS</span><p>{councilResult.proposal.situationSummary}</p></div>
              <aside><b>MODEL RECOMMENDATION WITHHELD</b><small>{councilResult.proposal.decisionLimit}</small></aside>
            </div>
            <article className="nankai-sol-question">
              <header><span>HIGHEST DECISION VALUE · HUMAN EVIDENCE GATE</span><em>SCORE {councilResult.adjudication.highestValueQuestion.deterministicValueScore}</em></header>
              <h4>{councilResult.adjudication.highestValueQuestion.question}</h4>
              <p>Request: {councilResult.adjudication.highestValueQuestion.evidenceToRequest}</p>
              <div><span><b>{councilResult.adjudication.highestValueQuestion.supplyCoverageSwingPoints} pt</b><small>supply swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.criticalPowerGapSwing}</b><small>power-gap swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.groundTransferSwing}</b><small>ground-plan swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.airRequestSwing}</b><small>air-request swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.inaccessibleLocationSwing}</b><small>isolation swing</small></span></div>
            </article>
            <div className="nankai-sol-worlds">
              {councilResult.adjudication.evaluations.map((world) => {
                const hypothesis = councilResult.proposal.hypotheses.find((item) => item.id === world.hypothesisId)!;
                const selected = selectedHypothesisId === world.hypothesisId;
                return (
                  <article className={`${world.verdict} ${selected ? "selected" : ""}`} key={world.hypothesisId}>
                    <header><i>{world.hypothesisId.toUpperCase()}</i><div><b>{world.title}</b><small>{Math.round(hypothesis.confidence * 100)}% epistemic support · not authority</small></div></header>
                    <p>{hypothesis.claim}</p>
                    <div className="nankai-sol-road-changes">{world.roadChanges.map((change) => <span className={change.state} key={change.roadId}><b>{change.roadId}</b><small>{change.state}</small></span>)}</div>
                    <div className="nankai-sol-world-metrics"><span><b>{world.metrics.supplyCoveragePercent}%</b><small>supply</small></span><span><b>{world.metrics.powerCriticalGaps}</b><small>power gaps</small></span><span><b>{world.metrics.medicalCasesPlanned}/5</b><small>ground plans</small></span><span><b>{world.metrics.inaccessibleLocations}</b><small>isolated</small></span></div>
                    <small className="nankai-sol-counter">Counterevidence: {hypothesis.evidenceAgainst[0]}</small>
                    <button type="button" onClick={() => { setSelectedHypothesisId(selected ? null : world.hypothesisId); setInterventionRoadId(null); }}>{selected ? "Return to baseline state" : "Inspect world on map · no authorization"}</button>
                  </article>
                );
              })}
            </div>
            <div className="nankai-sol-proof"><span><b>{councilResult.adjudication.computationalEvidence.worldsReplanned}</b><small>worlds re-planned</small></span><span><b>{councilResult.adjudication.computationalEvidence.exactAssignmentCandidates}</b><small>exact assignments</small></span><span><b>{councilResult.adjudication.computationalEvidence.routeSearches}</b><small>route searches</small></span><span><b>{councilResult.adjudication.computationalEvidence.minCostFlowAugmentations}</b><small>flow paths</small></span><span><b>{councilResult.performance.kernelLatencyMs === null ? "BOUNDED" : `${councilResult.performance.kernelLatencyMs.toFixed(1)} ms`}</b><small>kernel · {councilResult.performance.totalLatencyMs.toFixed(0)} ms total</small></span></div>
            <p className="nankai-sol-boundary">{councilResult.adjudication.advisoryConclusion} Hidden chain-of-thought is never operational evidence; only strict schema output, counterevidence and independently reproduced consequences are shown.</p>
          </div>
        ) : (
          <div className="nankai-sol-empty"><span><i>1</i><b>Generate rivals</b><small>Exactly three bounded road worlds</small></span><span><i>2</i><b>Preserve doubt</b><small>Evidence, counterevidence, assumptions</small></span><span><i>3</i><b>Re-plan all missions</b><small>615 exact assignments in the fixture</small></span><span><i>4</i><b>Ask one fact</b><small>Largest deterministic consequence</small></span></div>
        )}
      </section>

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
          <header><div><span>{selectedWorld ? `INSPECTING SOL WORLD ${selectedWorld.hypothesisId.toUpperCase()} · NO AUTHORIZATION` : "SHARED RESPONSE STATE"}</span><b>{selectedWorld?.title ?? analysis.scenarioLabel}</b></div><em>{activePhase.label.toUpperCase()} · SYNTHETIC</em></header>
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
        <article className="nankai-export"><span>REPLAY PACKAGE</span><b>{councilResult ? "Sol worlds + inspected response state" : "Versioned synthetic decision state"}</b><p>{councilResult ? "Proposal, counterevidence, three-world adjudication, selected inspection state, algorithms and hard gates receive a canonical SHA-256 digest." : "Road states, allocations, unresolved cases, algorithm counters, official basis and hard gates receive a canonical SHA-256 digest."}</p><button type="button" onClick={() => void downloadEvidence()} disabled={exportState === "working"}>{exportState === "working" ? "Hashing evidence…" : exportState === "done" ? "Evidence downloaded" : councilResult ? "Export Sol council evidence JSON" : "Export response evidence JSON"}</button></article>
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
