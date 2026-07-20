"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_NEEDS,
  buildResilienceAnalysis,
  buildVerifiedPlan,
  type DispatchPlan,
  type ResilienceAnalysis,
} from "@/lib/planner";
import {
  buildEmergencyCouncilEvidence,
  type EmergencyHypothesisId,
  type EmergencyReasoningAdjudication,
  type EmergencyReasoningProposal,
  type EmergencyWorldEvaluation,
} from "@/lib/emergency-reasoning";
import {
  buildEmergencyTwinEvidence,
  buildEmergencyTwinSnapshot,
  type TwinLayer,
  type TwinScenario,
} from "@/lib/emergency-twin";
import EmergencyDigitalTwin from "./emergency-digital-twin";
import EmergencyPowerMap from "./emergency-power-map";

interface EmergencyCommandProps {
  onSwitchToRegional: () => void;
}

interface EmergencyCouncilResult {
  mode: "gpt-5.6-sol" | "demo-fallback";
  reason: "no-key" | "api-unavailable" | null;
  responseModel: string;
  proposal: EmergencyReasoningProposal;
  adjudication: EmergencyReasoningAdjudication;
  performance: {
    modelLatencyMs: number | null;
    kernelLatencyMs: number | null;
    totalLatencyMs: number;
    kernelTiming: "measured" | "platform-clock-limited";
    usage: { inputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null };
  };
  boundaries: string[];
}

const DEFAULT_REPORT = "East Water Station reports 4.2 kW for four hours, but its controller has not authenticated whether the vehicle-facing pump start-up peak is capped at 4.2 kW or reaches 6.5 kW. One responder says East Bridge is passable; road maintenance says it is restricted. The fleet board shows E-44 available, while a provisional radio message says it was committed elsewhere.";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function worldStatus(world: EmergencyWorldEvaluation) {
  if (world.metrics.unservedCriticalKwh > 0) return "CRITICAL GAP";
  if (world.metrics.fullMissionSuccessRate < 100) return "STRESS RISK";
  return "ROBUST FEASIBLE";
}

function countFailures(plan: DispatchPlan) {
  return plan.assignments.flatMap((assignment) => assignment.checks).filter((check) => !check.pass).length;
}

export default function EmergencyCommand({ onSwitchToRegional }: EmergencyCommandProps) {
  const baselinePlan = useMemo(() => buildVerifiedPlan([], DEFAULT_NEEDS), []);
  const [report, setReport] = useState(DEFAULT_REPORT);
  const [council, setCouncil] = useState<EmergencyCouncilResult | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("Three testable worlds are ready. No world will be applied automatically.");
  const [inspectedWorldId, setInspectedWorldId] = useState<EmergencyHypothesisId | null>(null);
  const [resilience, setResilience] = useState<ResilienceAnalysis | null>(null);
  const [resilienceWorking, setResilienceWorking] = useState(false);
  const [leadApproval, setLeadApproval] = useState<string | null>(null);
  const [safetyApproval, setSafetyApproval] = useState<string | null>(null);
  const [twinMinute, setTwinMinute] = useState(0);
  const [twinScenario, setTwinScenario] = useState<TwinScenario>("nominal");
  const [twinLayer, setTwinLayer] = useState<TwinLayer>("estimated");
  const [twinPlaying, setTwinPlaying] = useState(false);

  const inspectedWorld = council?.adjudication.evaluations.find((world) => world.hypothesisId === inspectedWorldId) ?? null;
  const inspectedHypothesis = council?.proposal.hypotheses.find((world) => world.id === inspectedWorldId) ?? null;
  const activePlan = inspectedWorld?.plan ?? baselinePlan;
  const optimizedStress = activePlan.optimization?.optimized;
  const baselineStress = activePlan.optimization?.baseline;
  const proof = council?.adjudication.computationalEvidence ?? {
    worldsReplanned: 1,
    exactAssignmentCandidates: baselinePlan.optimization?.candidatePlans ?? 0,
    stressScenarios: baselinePlan.optimization?.scenarioCount ?? 0,
    planScenarioEvaluations: baselinePlan.optimization?.scenarioEvaluations ?? 0,
  };
  const twinSnapshot = useMemo(
    () => buildEmergencyTwinSnapshot(activePlan, twinMinute, twinScenario),
    [activePlan, twinMinute, twinScenario],
  );

  useEffect(() => {
    if (!twinPlaying) return;
    const timer = window.setInterval(() => {
      setTwinMinute((current) => {
        if (current >= 90) {
          setTwinPlaying(false);
          return 90;
        }
        return current + 5;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [twinPlaying]);

  async function runCouncil() {
    setWorking(true);
    setCouncil(null);
    setInspectedWorldId(null);
    setLeadApproval(null);
    setSafetyApproval(null);
    setMessage("Sol is separating counter-hypotheses. The exact kernel will independently re-plan every world…");
    try {
      const response = await fetch("/api/emergency-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const payload = await response.json() as EmergencyCouncilResult & { error?: string };
      if (!response.ok || !payload.adjudication) throw new Error(payload.error ?? "Emergency reasoning unavailable");
      setCouncil(payload);
      setMessage(payload.mode === "gpt-5.6-sol"
        ? `Sol live · ${payload.adjudication.computationalEvidence.planScenarioEvaluations.toLocaleString()} deterministic plan/world evaluations completed.`
        : `Verified fallback · ${payload.adjudication.computationalEvidence.planScenarioEvaluations.toLocaleString()} deterministic plan/world evaluations completed. Add a funded API key for live Sol reasoning.`);
    } catch {
      setMessage("The council could not be verified. No planning world was changed and field operation remains blocked.");
    } finally {
      setWorking(false);
    }
  }

  async function runResilience() {
    setResilienceWorking(true);
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    const result = buildResilienceAnalysis(DEFAULT_NEEDS);
    setResilience(result);
    setResilienceWorking(false);
    setLeadApproval(null);
    setSafetyApproval(null);
  }

  async function exportEvidence() {
    if (!council || !leadApproval || !safetyApproval) return;
    const councilEvidence = await buildEmergencyCouncilEvidence(council.proposal, council.adjudication, inspectedWorldId, council.mode);
    downloadJson("lifeline-grid-emergency-power-evidence.json", {
      councilEvidence,
      exerciseDualControl: {
        scope: "synthetic-tabletop-only",
        incidentLeadConfirmedAt: leadApproval,
        safetyOfficerConfirmedAt: safetyApproval,
        fieldAuthorityGranted: false,
      },
    });
  }

  async function exportTwinEvidence() {
    const evidence = await buildEmergencyTwinEvidence(twinSnapshot, activePlan);
    downloadJson(`lifeline-grid-twin-${twinScenario}-t${String(twinMinute).padStart(2, "0")}.json`, evidence);
  }

  function changeTwinScenario(scenario: TwinScenario) {
    setTwinPlaying(false);
    setTwinScenario(scenario);
    setTwinMinute(scenario === "nominal" ? 0 : scenario === "telemetry_loss" ? 50 : scenario === "pump_drift" ? 45 : 35);
  }

  function askSolAboutTwinConflict() {
    setReport(DEFAULT_REPORT);
    document.getElementById("sol-council")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="emergency2-shell">
      <header className="emergency2-topbar">
        <a className="emergency2-brand" href="#top" aria-label="Lifeline Grid Emergency Power home">
          <span className="emergency2-brandmark"><i /><i /><i /></span>
          <span><b>LIFELINE GRID</b><small>Emergency Power</small></span>
        </a>
        <nav className="emergency2-product-switch" aria-label="Product mode">
          <button className="active" type="button">Emergency Power</button>
          <button type="button" onClick={onSwitchToRegional}>Regional Access</button>
        </nav>
        <div className="emergency2-runtime"><i /><span><b>SYNTHETIC PILOT</b><small>FIELD OPERATION BLOCKED</small></span></div>
      </header>

      <section className="emergency2-hero" id="top">
        <div>
          <p className="emergency2-eyebrow">GPT-5.6 SOL × OPERATIONAL DIGITAL TWIN</p>
          <h1>See the emergency grid as it is—<em>and six hours before it fails.</em></h1>
          <p>Lifeline synchronizes synthetic telemetry, estimates hidden state and forecasts plan divergence. Sol branches ambiguity into falsifiable worlds; exact optimization proves every physical consequence. Humans retain authority.</p>
        </div>
        <div className="emergency2-hero-action">
          <button type="button" onClick={() => void runCouncil()} disabled={working}>
            <span>{working ? "Building three worlds…" : "Run Sol Power Council"}<small>{working ? "High reasoning + exact re-planning" : "One report · three worlds · one question"}</small></span>
            <i>{working ? "…" : "→"}</i>
          </button>
          <p><b>{council?.mode === "gpt-5.6-sol" ? "SOL LIVE" : council ? "VERIFIED FALLBACK" : "READY"}</b>{message}</p>
        </div>
      </section>

      <section className="emergency2-how" aria-label="How Lifeline Grid works">
        <article><span>01</span><div><b>Synchronize the operational twin</b><small>Event-sourced telemetry, Kalman state estimation and explicit freshness—never a static dashboard.</small></div></article>
        <i>→</i>
        <article><span>02</span><div><b>Forecast + challenge the plan</b><small>A deterministic 6h forecast meets exact allocation, physical constraints and stress testing.</small></div></article>
        <i>→</i>
        <article><span>03</span><div><b>Sol branches uncertainty; humans decide</b><small>Highest-value evidence first, dual control and a cryptographic replay package.</small></div></article>
      </section>

      <EmergencyDigitalTwin
        snapshot={twinSnapshot}
        layer={twinLayer}
        minute={twinMinute}
        playing={twinPlaying}
        onLayerChange={setTwinLayer}
        onMinuteChange={(minute) => { setTwinPlaying(false); setTwinMinute(minute); }}
        onPlayingChange={setTwinPlaying}
        onScenarioChange={changeTwinScenario}
        onExportEvidence={() => void exportTwinEvidence()}
        onAskSol={askSolAboutTwinConflict}
      />

      <section className="emergency2-dashboard">
        <div className="emergency2-map-card">
          <header><div><span>LIVE DECISION TWIN</span><h2>Mobile power coordination</h2></div><p>{inspectedWorld ? `${inspectedWorld.title} · inspection` : "Nominal reference · no Sol world selected"}</p></header>
          <EmergencyPowerMap
            plan={activePlan}
            blockedRouteIds={inspectedHypothesis?.blockedRouteIds ?? []}
            unavailableVehicleIds={inspectedHypothesis?.unavailableVehicleIds ?? []}
            inspectedWorldLabel={inspectedWorld?.title ?? null}
            twinSnapshot={twinSnapshot}
            twinLayer={twinLayer}
          />
        </div>

        <aside className="emergency2-rail">
          <header><span>VERIFIED OUTCOME</span><b>{activePlan.allNeedsServed ? "All modeled needs feasible" : "Critical service gap detected"}</b><small>{inspectedWorld ? "Selected for inspection only" : "Nominal reference plan"}</small></header>
          <div className="emergency2-kpis">
            <article><small>Critical coverage</small><b>{activePlan.criticalSiteHours}<em>h</em></b><span>of 12 site-hours</span></article>
            <article className={activePlan.unservedCriticalKwh ? "risk" : "good"}><small>Critical gap</small><b>{activePlan.unservedCriticalKwh}<em>kWh</em></b><span>{activePlan.unservedCriticalKwh ? "unserved" : "zero modeled gap"}</span></article>
            <article><small>Stress success</small><b>{formatPercent(optimizedStress?.successRate ?? 0)}</b><span>256 bounded worlds</span></article>
            <article><small>Constraint failures</small><b>{countFailures(activePlan)}</b><span>6 checks / mission</span></article>
          </div>
          <div className="emergency2-comparison">
            <header><span>WHY NOT NEAREST-FIRST?</span><small>Same modeled state</small></header>
            <div><span><small>Greedy / nearest</small><b>{formatPercent(baselineStress?.successRate ?? 0)}</b><em>{baselineStress?.violationScenarios ?? 0} violation worlds</em></span><i>→</i><span className="winner"><small>Lifeline exact</small><b>{formatPercent(optimizedStress?.successRate ?? 0)}</b><em>{activePlan.optimization?.optimized.violationScenarios ?? 0} violation worlds</em></span></div>
          </div>
          <div className="emergency2-proof-mini">
            <span><b>{proof.exactAssignmentCandidates.toLocaleString()}</b><small>exact candidates</small></span>
            <span><b>{proof.stressScenarios.toLocaleString()}</b><small>stress worlds</small></span>
            <span><b>{proof.planScenarioEvaluations.toLocaleString()}</b><small>plan/world tests</small></span>
          </div>
        </aside>
      </section>

      <section className="emergency2-council" id="sol-council">
        <header><div><span>SOL UNCERTAINTY COUNCIL</span><h2>One narrative is unsafe. Test competing worlds.</h2><p>The report is treated as untrusted data. Sol may frame hypotheses; it cannot calculate consequences or authorize action.</p></div>{council ? <em className={council.mode === "gpt-5.6-sol" ? "live" : "fallback"}>{council.mode === "gpt-5.6-sol" ? "GPT-5.6 SOL LIVE" : "DETERMINISTIC FALLBACK"}</em> : null}</header>
        <div className="emergency2-input">
          <label><span>CONFLICTING FIELD REPORT · SYNTHETIC</span><textarea value={report} onChange={(event) => setReport(event.target.value)} maxLength={6000} /></label>
          <button type="button" onClick={() => void runCouncil()} disabled={working}><span>{working ? "Reasoning…" : "Generate + prove 3 worlds"}<small>Sol high reasoning → strict JSON → exact kernel</small></span><i>{working ? "…" : "↗"}</i></button>
        </div>

        {council ? (
          <>
            <div className="emergency2-worlds">
              {council.adjudication.evaluations.map((world) => {
                const hypothesis = council.proposal.hypotheses.find((item) => item.id === world.hypothesisId)!;
                const selected = inspectedWorldId === world.hypothesisId;
                return (
                  <article key={world.hypothesisId} className={`${selected ? "selected" : ""} ${world.metrics.unservedCriticalKwh ? "risk" : ""}`}>
                    <header><span>{world.hypothesisId.toUpperCase()}</span><em>{worldStatus(world)}</em></header>
                    <h3>{world.title}</h3>
                    <p>{hypothesis.interpretation}</p>
                    <div><span><b>{world.metrics.criticalSiteHours}h</b><small>critical coverage</small></span><span><b>{world.metrics.unservedCriticalKwh} kWh</b><small>critical gap</small></span><span><b>{formatPercent(world.metrics.fullMissionSuccessRate)}</b><small>stress success</small></span></div>
                    <ul><li>{hypothesis.blockedRouteIds.length ? `${hypothesis.blockedRouteIds.join(", ")} blocked` : "No modeled route closure"}</li><li>{hypothesis.unavailableVehicleIds.length ? `${hypothesis.unavailableVehicleIds.join(", ")} unavailable` : "All assets modeled available"}</li><li>{hypothesis.waterPeakMode === "adverse" ? "6.5 kW adverse pump peak" : "4.2 kW confirmed peak cap"}</li></ul>
                    <button type="button" onClick={() => setInspectedWorldId(selected ? null : world.hypothesisId)}>{selected ? "Return to nominal reference" : "Inspect world · no authorization"}</button>
                  </article>
                );
              })}
            </div>

            <div className="emergency2-question">
              <header><span><i>01</i> HIGHEST-VALUE FIELD EVIDENCE</span><em>MODEL RECOMMENDATION WITHHELD</em></header>
              <h3>{council.adjudication.highestValueQuestion.question}</h3>
              <p><b>Request:</b> {council.adjudication.highestValueQuestion.evidenceToRequest}</p>
              <div><span><b>{council.adjudication.highestValueQuestion.criticalEnergySwingKwh} kWh</b><small>critical gap swing</small></span><span><b>{council.adjudication.highestValueQuestion.criticalCoverageSwingHours} h</b><small>coverage swing</small></span><span><b>{council.adjudication.highestValueQuestion.fullMissionSuccessSwingPoints} pts</b><small>mission swing</small></span><span><b>{council.adjudication.highestValueQuestion.valueScore.toLocaleString()}</b><small>deterministic value score</small></span></div>
            </div>
          </>
        ) : (
          <div className="emergency2-council-empty"><span>H1</span><span>H2</span><span>H3</span><p>Run the council to compare three falsifiable network and asset worlds. No result changes operational state automatically.</p></div>
        )}
      </section>

      <section className="emergency2-assignments">
        <header><div><span>PHYSICS-AWARE PLAN</span><h2>Every assignment carries its proof.</h2></div><p>{inspectedWorld ? `${inspectedWorld.title} · inspection state` : "Nominal verified reference"}</p></header>
        <div>
          {activePlan.assignments.map((assignment) => (
            <article key={assignment.need.id} className={assignment.safe ? "safe" : "unsafe"}>
              <header><span>{assignment.need.priority.toUpperCase()}</span><em>{assignment.safe ? "6/6 PASS" : `${assignment.checks.filter((check) => check.pass).length}/6 PASS`}</em></header>
              <h3>{assignment.vehicle.id} <i>→</i> {assignment.need.facility}</h3>
              <p>{assignment.route.routeLabel} · {assignment.effectiveOneWayMinutes} min · {assignment.need.connector} · {assignment.demandKwh} kWh delivered</p>
              <div className="emergency2-soc"><span><small>Start SoC</small><b>{assignment.vehicle.soc}%</b></span><i><u style={{ width: `${assignment.vehicle.soc}%` }} /><u className="after" style={{ width: `${Math.max(0, assignment.postMissionSoc)}%` }} /></i><span><small>After mission</small><b>{assignment.postMissionSoc}%</b></span></div>
              <ul>{assignment.checks.map((check) => <li key={check.code} className={check.pass ? "pass" : "fail"}><i>{check.pass ? "✓" : "×"}</i><span><b>{check.label}</b><small>{check.detail}</small></span></li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="emergency2-hardening">
        <div className="emergency2-hardening-copy"><span>N-1 RESILIENCE</span><h2>Prove the plan survives one failure.</h2><p>Exact contingency search removes each modeled vehicle or route, then selects the minimum intervention that protects critical service.</p><button type="button" onClick={() => void runResilience()} disabled={resilienceWorking}>{resilienceWorking ? "Testing every single failure…" : resilience ? "Re-run N-1 proof" : "Run N-1 hardening"}</button></div>
        <div className="emergency2-hardening-result">
          {resilience ? <><header><span><small>Before</small><b>{resilience.baseline.protectedContingencies}/{resilience.contingencyCount}</b><em>protected</em></span><i>→</i><span className="after"><small>After</small><b>{resilience.selectedAction.protectedContingencies}/{resilience.contingencyCount}</b><em>{resilience.selectedAction.nMinusOneCertified ? "N-1 CERTIFIED IN MODEL" : "residual gap"}</em></span></header><h3>{resilience.selectedAction.label}</h3><p>{resilience.selectedAction.detail}</p><div><span><b>{resilience.candidateActions.length}</b><small>actions compared</small></span><span><b>{resilience.totalPlanScenarioEvaluations.toLocaleString()}</b><small>plan/world tests</small></span><span><b>{resilience.eliminatedSinglePoints}</b><small>single points removed</small></span></div></> : <><b>10/12</b><span>single-failure cases protected in the unprepared baseline</span><small>Run the exact N-1 search to find the lowest-cost hardening action.</small></>}
        </div>
      </section>

      <section className="emergency2-gate">
        <header><div><span>HUMAN AUTHORITY GATE</span><h2>AI recommends evidence. People authorize exercises.</h2></div><em>FIELD OPERATION BLOCKED</em></header>
        <div className="emergency2-gate-grid">
          <article className={leadApproval ? "confirmed" : ""}><span>01</span><h3>Incident Lead</h3><p>Confirms the inspected state and synthetic exercise scope. This does not create dispatch authority.</p><button type="button" disabled={!council} onClick={() => setLeadApproval(leadApproval ? null : new Date().toISOString())}>{leadApproval ? "✓ Exercise scope confirmed" : "Confirm exercise scope"}</button></article>
          <article className={safetyApproval ? "confirmed" : ""}><span>02</span><h3>Safety Officer</h3><p>Independent co-sign confirms separation of duties. Electrical and route validation remain external gates.</p><button type="button" disabled={!leadApproval} onClick={() => setSafetyApproval(safetyApproval ? null : new Date().toISOString())}>{safetyApproval ? "✓ Independent co-sign recorded" : "Record independent co-sign"}</button></article>
          <article className={leadApproval && safetyApproval ? "confirmed" : ""}><span>03</span><h3>Evidence package</h3><p>Canonical council input, all three exact outcomes, boundaries and a SHA-256 digest for replay.</p><button type="button" disabled={!leadApproval || !safetyApproval} onClick={() => void exportEvidence()}>Download audit package</button></article>
        </div>
        <p className="emergency2-boundary"><b>Deployment boundary:</b> This prototype does not diagnose road safety, certify electrical equipment, access a live fleet, dispatch vehicles or actuate infrastructure. Field use requires authenticated adapters, local validation, emergency-organization authority and applicable certification.</p>
      </section>

      <footer className="emergency2-footer"><span><b>LIFELINE GRID</b><small>Verified Mobile Power Coordination</small></span><p>Built with Codex · GPT-5.6 Sol reasoning · deterministic exact optimization · synthetic data only</p><button type="button" onClick={onSwitchToRegional}>Explore Regional Access →</button></footer>
    </main>
  );
}
