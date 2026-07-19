"use client";

import { useEffect, useMemo, useState } from "react";
import {
  REGIONAL_MODEL,
  analyzeRegionalAccess,
} from "@/lib/regional";
import type { AssuranceSnapshot } from "@/lib/assurance";
import RealRegionalMap from "./real-regional-map";
import RegionalScaleLab from "./regional-scale-lab";
import DataTrustGateway from "./data-trust-gateway";
import ContinuityCapsule from "./continuity-capsule";

type AiMode = "ready" | "gpt-5.6" | "demo-fallback";

interface RegionalAccessProps {
  onSwitchToEmergency: () => void;
}

interface LedgerRun {
  id: string;
  role: "owner" | "reviewer";
  scenarioLabel: string;
  status: "draft" | "review_pending" | "approved" | "rejected" | "superseded";
  inputDigest: string;
  optimalityCertified: boolean;
  metrics: {
    householdCoveragePercent: number;
    vulnerableCoveragePercent: number;
    criticalFailures: number;
    totalDistanceKm: number;
  };
  repairBudgetM: number | null;
  previousRunId: string | null;
  changeSummary: {
    baseline: boolean;
    householdCoverageDelta: number;
    vulnerableCoverageDelta: number;
    criticalFailureDelta: number;
    distanceKmDelta: number;
    routeVehiclesChanged: number;
  };
  reviewerEmail: string | null;
  createdAt: string;
}

interface CouncilResult {
  mode: "gpt-5.6-sol" | "demo-fallback";
  responseModel: string;
  proposal: {
    situationSummary: string;
    authoritySignal: "confirmed" | "unconfirmed" | "conflicting";
    uncertaintySummary: string;
    decisionLimit: string;
    recommendedHypothesisId: "h1" | "h2" | "h3";
    hypotheses: Array<{
      id: "h1" | "h2" | "h3";
      title: string;
      state: "open" | "closed" | "weight_limited";
      weightLimitT: number;
      claim: string;
      evidenceAgainst: string[];
      confidence: number;
    }>;
  };
  adjudication: {
    actionGate: "human_authority_required";
    modelRecommendationStatus: "withheld_pending_evidence";
    evaluations: Array<{
      hypothesisId: "h1" | "h2" | "h3";
      roadLabel: string;
      state: "open" | "closed" | "weight_limited";
      weightLimitT: number | null;
      householdsAffected: number;
      vulnerableResidentsAffected: number;
      verdict: "modeled_for_review" | "service_gap" | "critical_service_gap";
      metrics: { householdCoveragePercent: number; vulnerableCoveragePercent: number; criticalFailures: number; totalDistanceKm: number };
      stress: { scenarioCount: number; criticalServiceSuccessRate: number };
      optimalityCertified: boolean;
    }>;
    highestValueQuestion: {
      question: string;
      evidenceToRequest: string;
      accessSwingHouseholds: number;
      vulnerableSwingResidents: number;
      criticalFailureSwing: number;
      criticalStressSwingPercent: number;
      safetyGate: boolean;
    };
    disagreement: { distinctRoadStates: number; householdAccessRange: number; vulnerableAccessRange: number; criticalFailureRange: number };
    computationalEvidence: {
      hypothesesEvaluated: number;
      activePlanCandidateAssignments: number;
      stressScenarios: number;
      nMinusOneRoadCases: number;
    };
    advisoryConclusion: string;
  };
  performance: {
    modelLatencyMs: number | null;
    kernelLatencyMs: number | null;
    totalLatencyMs: number;
    kernelTiming: "measured" | "platform-clock-limited";
    usage: { inputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null };
  };
}

const DEFAULT_COUNCIL_REPORT = "After heavy rain, a community driver reports debris and possible retaining-wall movement on North Forest Road. A second report says small vehicles are still passing. The road authority status is pending. Time-sensitive medicine must still reach Shirasagi and Kitayama.";

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

export default function RegionalAccess({ onSwitchToEmergency }: RegionalAccessProps) {
  const [closedSegmentId, setClosedSegmentId] = useState<string | null>(null);
  const [budgetM, setBudgetM] = useState(120);
  const [aiMode, setAiMode] = useState<AiMode>("ready");
  const [working, setWorking] = useState(false);
  const [eventSummary, setEventSummary] = useState("Inspection note has not been interpreted yet.");
  const [ledgerRuns, setLedgerRuns] = useState<LedgerRun[]>([]);
  const [ledgerState, setLedgerState] = useState<"loading" | "ready" | "saving" | "unavailable" | "auth-required">("loading");
  const [ledgerMessage, setLedgerMessage] = useState("Loading durable decision history…");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [councilReport, setCouncilReport] = useState(DEFAULT_COUNCIL_REPORT);
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null);
  const [councilWorking, setCouncilWorking] = useState(false);
  const [councilMessage, setCouncilMessage] = useState("Three competing worlds are ready to be generated and tested.");
  const [assurance, setAssurance] = useState<AssuranceSnapshot | null>(null);
  const [assuranceMessage, setAssuranceMessage] = useState("Verifying runtime controls without assuming readiness…");
  const analysis = useMemo(() => analyzeRegionalAccess(closedSegmentId, budgetM), [budgetM, closedSegmentId]);
  const criticalityById = useMemo(
    () => new Map(analysis.roadCriticality.map((item) => [item.road.id, item])),
    [analysis.roadCriticality],
  );
  const activeClosure = closedSegmentId ? criticalityById.get(closedSegmentId) : null;

  async function loadLedger() {
    try {
      const response = await fetch("/api/regional-runs", { headers: { Accept: "application/json" } });
      if (response.status === 401) {
        setLedgerState("auth-required");
        setLedgerMessage("Sign in with ChatGPT to save identity-scoped decision history.");
        return;
      }
      if (!response.ok) throw new Error("Ledger unavailable");
      const payload = await response.json() as { runs?: LedgerRun[] };
      setLedgerRuns(payload.runs ?? []);
      setLedgerState("ready");
      setLedgerMessage(payload.runs?.length ? "Durable history loaded." : "No decision records yet. Save the current plan as the first baseline.");
    } catch {
      setLedgerState("unavailable");
      setLedgerMessage("The durable ledger is unavailable; planning remains read-only.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLedger(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/assurance", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Assurance evidence unavailable");
        const payload = await response.json() as AssuranceSnapshot;
        setAssurance(payload);
        setAssuranceMessage(`${payload.summary.implementedControls} software controls evidenced · ${payload.summary.blockingGatesOpen} independent gates remain open.`);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setAssuranceMessage("Runtime assurance could not be proven; operational use remains blocked.");
      });
    return () => controller.abort();
  }, []);

  async function interpretInspection() {
    setWorking(true);
    try {
      const response = await fetch("/api/regional-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: "Road authority note: North Forest Road is closed pending a structural inspection. Heavy community vehicles must use alternate routes.",
        }),
      });
      if (!response.ok) throw new Error("Regional event unavailable");
      const payload = await response.json() as {
        mode?: AiMode;
        event?: { roadSegmentId?: string; operatorSummary?: string };
      };
      const roadId = payload.event?.roadSegmentId;
      if (!roadId || !REGIONAL_MODEL.roads.some((road) => road.id === roadId)) throw new Error("Unknown road");
      setClosedSegmentId(roadId);
      setAiMode(payload.mode === "gpt-5.6" ? "gpt-5.6" : "demo-fallback");
      setEventSummary(payload.event?.operatorSummary ?? "A road restriction was converted into planning state.");
    } catch {
      setClosedSegmentId("center-north");
      setAiMode("demo-fallback");
      setEventSummary("North Forest Road is unavailable for the current planning window.");
    }
    setWorking(false);
  }

  async function runReasoningCouncil() {
    setCouncilWorking(true);
    setCouncilMessage("Sol is generating counter-hypotheses; the deterministic kernel will test each one…");
    try {
      const response = await fetch("/api/regional-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: councilReport, budgetM }),
      });
      const payload = await response.json() as CouncilResult & { error?: string };
      if (!response.ok || !payload.adjudication) throw new Error(payload.error ?? "Reasoning council unavailable");
      setCouncilResult(payload);
      setAiMode(payload.mode === "gpt-5.6-sol" ? "gpt-5.6" : "demo-fallback");
      setCouncilMessage(payload.mode === "gpt-5.6-sol"
        ? "Live Sol hypotheses were contract-validated and counterfactually tested."
        : "Transparent fallback hypotheses were counterfactually tested; live Sol was unavailable.");
    } catch (error) {
      setCouncilMessage(error instanceof Error ? error.message : "Reasoning council unavailable");
    } finally {
      setCouncilWorking(false);
    }
  }

  async function saveDecisionRecord() {
    setLedgerState("saving");
    setLedgerMessage("Recomputing and recording the current decision…");
    const previousOwnerRun = ledgerRuns.find((run) => run.role === "owner" && run.status !== "superseded");
    try {
      const response = await fetch("/api/regional-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planRequest: {
            schemaVersion: "2026-07-19",
            model: REGIONAL_MODEL,
            closedRoadIds: closedSegmentId ? [closedSegmentId] : [],
          },
          scenarioLabel: activeClosure ? `${activeClosure.road.label} restriction` : "Baseline regional plan",
          repairBudgetM: budgetM,
          previousRunId: previousOwnerRun?.id ?? null,
          reviewerEmail: reviewerEmail.trim() || null,
        }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Decision record failed");
      await loadLedger();
      setLedgerMessage(reviewerEmail.trim()
        ? "Plan recorded and assigned to an independent reviewer."
        : "Plan recorded as a draft. Add a different reviewer email before operational approval.");
    } catch (error) {
      setLedgerState("unavailable");
      setLedgerMessage(error instanceof Error ? error.message : "Decision record failed");
    }
  }

  async function reviewRun(runId: string, decision: "approved" | "rejected") {
    setLedgerState("saving");
    setLedgerMessage(`${decision === "approved" ? "Approving" : "Rejecting"} decision record…`);
    try {
      const response = await fetch(`/api/regional-runs/${runId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: decision === "approved" ? "Reviewed against the recorded constraints." : "Returned for operator revision." }),
      });
      if (!response.ok) throw new Error("Review could not be recorded");
      await loadLedger();
      setLedgerMessage(`Independent review recorded: ${decision}.`);
    } catch (error) {
      setLedgerState("unavailable");
      setLedgerMessage(error instanceof Error ? error.message : "Review failed");
    }
  }

  async function verifyAudit(runId: string) {
    setLedgerMessage("Replaying the audit hash chain…");
    try {
      const response = await fetch(`/api/regional-runs/${runId}/audit`);
      const payload = await response.json() as { verified?: boolean; events?: unknown[] };
      if (!response.ok || !payload.verified) throw new Error("Audit verification failed");
      setLedgerMessage(`Audit verified across ${payload.events?.length ?? 0} linked events.`);
    } catch {
      setLedgerMessage("Audit verification failed; do not rely on this record.");
    }
  }

  return (
    <main className="command-shell regional-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="brand-name">Lifeline Grid</p>
            <p className="brand-tagline">Regional Access OS</p>
          </div>
        </div>
        <div className="topbar-actions regional-top-actions">
          <nav className="product-switch" aria-label="Product mode">
            <button className="active" type="button" aria-current="page">Regional access</button>
            <button type="button" onClick={onSwitchToEmergency}>Emergency grid</button>
          </nav>
          <span className="simulation-pill"><i /> Synthetic Japan district</span>
        </div>
      </header>

      <section className="regional-hero">
        <div>
          <p className="eyebrow">RURAL INFRASTRUCTURE × SHARED LOGISTICS</p>
          <h1>Keep every resident connected to essentials—even when roads age.</h1>
          <p>One regional twin links bridge condition, vulnerable residents, mixed fleets, delivery deadlines and repair budgets. It optimizes access, not only distance.</p>
        </div>
        <div className="regional-hero-action">
          <button type="button" onClick={() => void interpretInspection()} disabled={working}>
            <span><b>{working ? "Interpreting inspection note…" : "Interpret inspection note + re-plan"}</b><small>GPT-5.6 → road state → exact regional optimum</small></span>
            <i>→</i>
          </button>
          <span className={`regional-ai-mode ${aiMode}`}>{aiMode === "gpt-5.6" ? "GPT-5.6 LIVE" : aiMode === "demo-fallback" ? "TRANSPARENT FALLBACK" : "NOTE READY"}</span>
        </div>
      </section>

      <RegionalScaleLab />

      <DataTrustGateway />

      <ContinuityCapsule
        closedSegmentId={closedSegmentId}
        repairBudgetM={budgetM}
        onRestore={(restoredClosure, restoredBudget) => {
          setClosedSegmentId(restoredClosure);
          setBudgetM(restoredBudget);
          setAiMode("ready");
          setEventSummary("Portable twin state was integrity-checked and reproduced by the current deterministic engine.");
        }}
      />

      <section className="regional-metrics" aria-label="Regional access metrics" aria-live="polite">
        <article><small>Household access</small><b>{analysis.activePlan.metrics.serviceCoveragePercent}%</b><span>{analysis.activePlan.metrics.householdsCovered}/418 covered on time</span></article>
        <article><small>Vulnerable coverage</small><b>{analysis.activePlan.metrics.vulnerableCoveragePercent}%</b><span>{analysis.activePlan.metrics.vulnerableResidentsCovered}/152 residents protected</span></article>
        <article><small>Critical stress proof</small><b>{analysis.stress.criticalServiceSuccessRate}%</b><span>{analysis.stress.scenarioCount} bounded scenarios</span></article>
        <article><small>Pooling distance gain</small><b>{analysis.pooledDistanceSavingPercent}%</b><span>vs single-stop dispatch</span></article>
        <article className="risk-metric"><small>Repair risk reduction</small><b>{analysis.repairPortfolio.riskReductionPercent}%</b><span>within ¥{budgetM}m budget</span></article>
      </section>

      <section className="regional-workspace map-first-workspace">
        <article className="panel regional-map-panel">
          <div className="regional-panel-heading">
            <div><p className="panel-kicker">REAL GEOGRAPHY × SERVICE-WEIGHTED ROAD GRAPH</p><h2>{analysis.model.district}</h2></div>
            <div className="regional-map-legend"><span><i className="risk" /> Access risk</span><span><i className="used" /> Active delivery</span><span><i className="repair" /> Repair portfolio</span></div>
          </div>
          <RealRegionalMap analysis={analysis} closedSegmentId={closedSegmentId} onRoadSelect={setClosedSegmentId} />
        </article>

        <aside className="regional-control-rail">
          <article className="panel scenario-panel">
            <div className="regional-panel-heading compact"><div><p className="panel-kicker">N-1 ACCESS TEST</p><h2>Break one road</h2></div><span>{analysis.roadCriticality.length} CASES</span></div>
            <p className="scenario-summary">{eventSummary}</p>
            <div className="road-risk-list">
              {analysis.roadCriticality.slice(0, 4).map((item) => (
                <button className={closedSegmentId === item.road.id ? "selected" : ""} type="button" onClick={() => setClosedSegmentId(item.road.id)} key={item.road.id}>
                  <i>#{item.rank}</i><span><b>{item.road.label}</b><small>Condition {item.road.conditionGrade} · {(item.road.annualFailureProbability * 100).toFixed(1)}% modeled annual risk</small></span><em>{item.vulnerableResidentsAtRisk > 0 ? `${item.vulnerableResidentsAtRisk} people` : `+${item.addedVehicleMinutes} min`}</em>
                </button>
              ))}
            </div>
            <button className="clear-scenario" type="button" onClick={() => { setClosedSegmentId(null); setEventSummary("Inspection note has not been interpreted yet."); setAiMode("ready"); }} disabled={!closedSegmentId}>Restore baseline network</button>
          </article>

          <article className="panel budget-panel">
            <div className="regional-panel-heading compact"><div><p className="panel-kicker">EXACT CAPITAL PORTFOLIO</p><h2>Spend where access matters</h2></div><strong>¥{budgetM}m</strong></div>
            <label htmlFor="repair-budget">Annual repair budget <span>¥40m</span><span>¥200m</span></label>
            <input id="repair-budget" type="range" min="40" max="200" step="10" value={budgetM} onChange={(event) => setBudgetM(Number(event.target.value))} />
            <div className="portfolio-selection">
              {analysis.repairPortfolio.selectedRoads.length > 0 ? analysis.repairPortfolio.selectedRoads.map((item) => (
                <div key={item.road.id}><span>REPAIR</span><b>{item.road.label}</b><small>¥{item.road.repairCostM}m · risk −{roundPercent(item.expectedAnnualRisk * 0.85)}</small></div>
              )) : <p>No modeled project fits this budget.</p>}
            </div>
            <div className="portfolio-proof"><span><b>{analysis.repairPortfolio.portfoliosEvaluated}</b><small>portfolios</small></span><span><b>¥{analysis.repairPortfolio.costM}m</b><small>selected</small></span><span><b>{analysis.repairPortfolio.riskReductionPercent}%</b><small>risk removed</small></span></div>
          </article>
        </aside>
      </section>

      <section className="panel reasoning-council-panel">
        <div className="reasoning-council-heading">
          <div>
            <p className="panel-kicker">SOL REASONING COUNCIL × DETERMINISTIC ADJUDICATION</p>
            <h2>Reason across uncertainty—then prove every consequence.</h2>
            <p>Sol proposes competing interpretations, counterevidence and the smallest missing fact. Lifeline independently re-plans every hypothesis; narrative confidence never becomes authority.</p>
          </div>
          <span className={`council-mode ${councilWorking ? "running" : councilResult?.mode ?? "idle"}`}>{councilWorking ? "REASONING" : councilResult?.mode === "gpt-5.6-sol" ? "SOL LIVE" : councilResult ? "VERIFIED FALLBACK" : "READY"}</span>
        </div>
        <div className="council-input">
          <label htmlFor="council-report"><span>Conflicting synthetic field reports</span><textarea id="council-report" value={councilReport} onChange={(event) => setCouncilReport(event.target.value)} maxLength={6000} rows={4} /></label>
          <button type="button" onClick={() => void runReasoningCouncil()} disabled={councilWorking || councilReport.trim().length === 0}><b>{councilWorking ? "Testing three worlds…" : "Run Sol Reasoning Council"}</b><small>Generate → challenge → re-plan → rank evidence</small></button>
        </div>
        <p className="council-message" aria-live="polite">{councilMessage}</p>
        {councilResult ? (
          <div className="council-result">
            <div className="council-summary">
              <div><span>SITUATION SYNTHESIS</span><p>{councilResult.proposal.situationSummary}</p></div>
              <aside><b>HUMAN AUTHORITY REQUIRED</b><small>{councilResult.proposal.decisionLimit}</small></aside>
            </div>
            <article className="council-question">
              <header><span>{councilResult.adjudication.highestValueQuestion.safetyGate ? "AUTHORITY GATE" : "HIGHEST DECISION VALUE"}</span><em>MODEL RECOMMENDATION WITHHELD</em></header>
              <h3>{councilResult.adjudication.highestValueQuestion.question}</h3>
              <p>Request: {councilResult.adjudication.highestValueQuestion.evidenceToRequest}</p>
              <div><span><b>{councilResult.adjudication.highestValueQuestion.accessSwingHouseholds}</b><small>households swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.vulnerableSwingResidents}</b><small>vulnerable residents</small></span><span><b>{councilResult.adjudication.highestValueQuestion.criticalFailureSwing}</b><small>critical-failure swing</small></span><span><b>{councilResult.adjudication.highestValueQuestion.criticalStressSwingPercent}%</b><small>critical stress swing</small></span></div>
            </article>
            <div className="council-hypotheses">
              {councilResult.adjudication.evaluations.map((evaluation) => {
                const hypothesis = councilResult.proposal.hypotheses.find((item) => item.id === evaluation.hypothesisId)!;
                return (
                  <article className={evaluation.verdict} key={evaluation.hypothesisId}>
                    <header><span>{hypothesis.id.toUpperCase()}</span><div><b>{hypothesis.title}</b><small>{evaluation.roadLabel}</small></div><em>{Math.round(hypothesis.confidence * 100)}% support</em></header>
                    <div className="hypothesis-state"><b>{evaluation.state === "weight_limited" ? `${evaluation.weightLimitT}t limit` : evaluation.state}</b><span>{evaluation.verdict.replaceAll("_", " ")}</span></div>
                    <p>{hypothesis.claim}</p>
                    <small className="counterevidence">Counterevidence: {hypothesis.evidenceAgainst[0] ?? "No counterevidence supplied."}</small>
                    <footer><span><b>{evaluation.metrics.householdCoveragePercent}%</b><small>households</small></span><span><b>{evaluation.metrics.vulnerableCoveragePercent}%</b><small>vulnerable</small></span><span><b>{evaluation.stress.criticalServiceSuccessRate}%</b><small>critical stress</small></span><span><b>{evaluation.optimalityCertified ? "EXACT" : "FEASIBLE"}</b><small>solver proof</small></span></footer>
                  </article>
                );
              })}
            </div>
            <div className="council-proof-strip"><span><b>{councilResult.adjudication.computationalEvidence.hypothesesEvaluated}</b><small>world models</small></span><span><b>{councilResult.adjudication.computationalEvidence.activePlanCandidateAssignments.toLocaleString()}</b><small>active assignments</small></span><span><b>{councilResult.adjudication.computationalEvidence.stressScenarios}</b><small>stress scenarios</small></span><span><b>{councilResult.adjudication.computationalEvidence.nMinusOneRoadCases}</b><small>N-1 road cases</small></span><span><b>{councilResult.performance.kernelLatencyMs === null ? "BOUNDED" : `${councilResult.performance.kernelLatencyMs.toFixed(2)} ms`}</b><small>kernel · {councilResult.performance.totalLatencyMs.toFixed(0)} ms total</small></span></div>
            <p className="council-boundary">{councilResult.adjudication.advisoryConclusion} The model&apos;s hidden chain of thought is never used as evidence; only schema-bound claims and independently reproduced metrics are shown.</p>
          </div>
        ) : (
          <div className="council-empty">
            <span><i>1</i><b>Generate rivals</b><small>Three mutually distinct road states</small></span><span><i>2</i><b>Attack assumptions</b><small>Evidence for, against and missing</small></span><span><i>3</i><b>Re-plan every world</b><small>Hard constraints and stress scenarios</small></span><span><i>4</i><b>Ask one fact</b><small>Largest decision-changing evidence</small></span>
          </div>
        )}
      </section>

      <section className="panel trust-plane-panel" aria-labelledby="trust-plane-title">
        <div className="trust-plane-heading">
          <div>
            <p className="panel-kicker">PRODUCTION TRUST PLANE × ASSURANCE CASE</p>
            <h2 id="trust-plane-title">Prove each safety claim—and block what is not proven.</h2>
            <p>Cryptographic source integrity, replay protection and human decision authority are machine-enforced. Certification and field validation can only come from independent evidence.</p>
          </div>
          <span className="certification-blocked">NOT CERTIFIED · FIELD BLOCKED</span>
        </div>
        <div className="trust-runtime-grid" aria-live="polite">
          <article className={assurance?.runtime.authorityRegistryConfigured ? "ready" : "blocked"}>
            <small>Authority PKI</small><b>{assurance?.runtime.authorityRegistryConfigured ? "PINNED" : "KEYS REQUIRED"}</b><span>ECDSA P-256 · issuer + key ID + road scope</span>
          </article>
          <article className={assurance?.runtime.replayStoreReady ? "ready" : "blocked"}>
            <small>Replay protection</small><b>{assurance?.runtime.replayStoreReady ? "DURABLE" : "UNPROVEN"}</b><span>Atomic event ID and monotonic sequence rejection</span>
          </article>
          <article className="ready">
            <small>Decision authority</small><b>HUMAN GATE</b><span>Verified events remain pending until authorized review</span>
          </article>
          <article className="blocked">
            <small>Safety claim</small><b>NO SELF-CERTIFY</b><span>Code evidence never becomes an audit certificate</span>
          </article>
        </div>
        <div className="trust-evidence-grid">
          <article>
            <header><div><span>SOFTWARE EVIDENCE</span><b>Controls implemented in this release</b></div><em>{assurance?.summary.implementedControls ?? "—"}/{assurance?.summary.totalControls ?? "—"}</em></header>
            <ul>
              {(assurance?.controls ?? []).slice(0, 5).map((control) => (
                <li key={control.id}><i>{control.status === "implemented" ? "✓" : "!"}</i><div><b>{control.id} · {control.title}</b><small>{control.runtime.replaceAll("_", " ")} · {control.frameworkRefs.join(" · ")}</small></div></li>
              ))}
              {!assurance ? <li><i>…</i><div><b>Loading signed assurance snapshot</b><small>No runtime dependency is presumed healthy while loading.</small></div></li> : null}
            </ul>
          </article>
          <article className="trust-gates">
            <header><div><span>INDEPENDENT BLOCKING GATES</span><b>Required before operational claims</b></div><em>{assurance?.summary.blockingGatesOpen ?? 7} OPEN</em></header>
            <ul>
              {(assurance?.blockingGates ?? [
                { id: "authority-pki", title: "Road authority key ceremony", satisfied: false, owner: "Road authority + security" },
                { id: "penetration-test", title: "Independent penetration test", satisfied: false, owner: "Security assessor" },
                { id: "dr-exercise", title: "Observed recovery exercise", satisfied: false, owner: "Operations + auditor" },
                { id: "shadow-pilot", title: "Supervised regional shadow pilot", satisfied: false, owner: "Municipality + operators" },
              ]).map((gate) => (
                <li key={gate.id}><i>×</i><div><b>{gate.title}</b><small>Owner: {gate.owner}</small></div></li>
              ))}
            </ul>
          </article>
        </div>
        <p className="trust-plane-message">{assuranceMessage} Signed data proves origin and integrity—not that a road is physically safe. No event is automatically applied.</p>
      </section>

      <section className="panel regional-plan-panel">
        <div className="regional-plan-heading">
          <div><p className="panel-kicker">POOLED HETEROGENEOUS VRPTW</p><h2>One public-interest plan across three operators</h2><p>Capacity, cold chain, road weight limits, deadlines and operator shifts remain hard constraints.</p></div>
          <span className={analysis.activePlan.metrics.criticalFailures === 0 ? "pass" : "fail"}>{analysis.activePlan.metrics.criticalFailures === 0 ? "CRITICAL ACCESS PROTECTED" : "CRITICAL ACCESS GAP"}</span>
        </div>
        <div className="regional-routes">
          {analysis.activePlan.routes.map((route) => (
            <article style={{ borderTopColor: route.vehicle.color }} key={route.vehicle.id}>
              <div><i style={{ background: route.vehicle.color }} /> <span><b>{route.vehicle.id} · {route.vehicle.label}</b><small>{route.vehicle.operator}</small></span><em>{route.parcels}/{route.vehicle.capacityParcels} parcels</em></div>
              <ol>{route.stops.map((stop, index) => <li key={stop.demandId}><i>{index + 1}</i><span><b>{stop.label}</b><small>ETA {formatMinutes(stop.arrivalMinutes)} · due {formatMinutes(stop.deadlineMinutes)}</small></span><em>{stop.onTime ? "ON TIME" : "LATE"}</em></li>)}</ol>
              <footer><span>{route.distanceKm} km</span><span>{formatMinutes(route.totalMinutes)}</span><span>{route.coldParcels} cold</span><span>{route.emissionsKg} kg CO₂e</span></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="regional-evidence-grid">
        <article className="panel regional-proof-card">
          <p className="panel-kicker">COMPUTATIONAL EVIDENCE</p>
          <h2>Inspectable optimization—not a chat answer</h2>
          <div><span><b>{analysis.evidence.deliveryCandidateAssignments.toLocaleString()}</b><small>fleet assignments</small></span><span><b>{analysis.evidence.nMinusOneRoadCases}</b><small>road failures</small></span><span><b>{analysis.evidence.repairPortfoliosEvaluated}</b><small>capital portfolios</small></span><span><b>{analysis.evidence.stressScenarios}</b><small>stress scenarios</small></span></div>
          <ol><li><i>1</i><span><b>Graph feasibility</b><small>Road closures and vehicle weight limits</small></span></li><li><i>2</i><span><b>Exact fleet search</b><small>Capacity, cold chain, shift and time windows</small></span></li><li><i>3</i><span><b>Service-weighted N-1</b><small>Households and vulnerable residents, not traffic alone</small></span></li><li><i>4</i><span><b>Exact budget knapsack</b><small>Maximum modeled access-risk reduction</small></span></li></ol>
        </article>
        <article className="panel regional-boundary-card">
          <p className="panel-kicker">RESPONSIBLE DEPLOYMENT</p>
          <h2>Decision support, never an invisible authority</h2>
          <ul><li><span>✓</span><div><b>Source-linked language interpretation</b><small>GPT-5.6 structures a note; deterministic code calculates impact.</small></div></li><li><span>✓</span><div><b>Counterfactual explanation</b><small>Every repair recommendation points to its modeled access consequence.</small></div></li><li><span>!</span><div><b>Synthetic data only</b><small>Road diagnosis, closures and dispatch remain with authorized organizations.</small></div></li></ul>
          <p>Production requires authoritative road data, live fleet feeds, tenant identity, signed audit storage and supervised regional validation.</p>
        </article>
      </section>

      <section className="panel regional-ledger-panel">
        <div className="regional-ledger-heading">
          <div><p className="panel-kicker">DURABLE DECISION GOVERNANCE</p><h2>Plan ledger, version diff and independent review</h2><p>Every saved run is recomputed server-side, linked to its predecessor and protected by a replayable SHA-256 audit chain.</p></div>
          <span className={`ledger-state ${ledgerState}`}>{ledgerState === "saving" ? "WRITING" : ledgerState === "ready" ? "DURABLE" : ledgerState === "auth-required" ? "SIGN-IN REQUIRED" : ledgerState === "loading" ? "LOADING" : "READ-ONLY"}</span>
        </div>
        <div className="ledger-compose">
          <label><span>Independent reviewer email <small>optional for draft; must differ from creator</small></span><input type="email" value={reviewerEmail} onChange={(event) => setReviewerEmail(event.target.value)} placeholder="reviewer@municipality.example" autoComplete="email" /></label>
          <button type="button" onClick={() => void saveDecisionRecord()} disabled={ledgerState === "saving" || ledgerState === "loading" || ledgerState === "auth-required"}><b>Record current plan</b><small>{activeClosure ? "Save disruption diff" : "Save verified baseline"}</small></button>
        </div>
        <p className="ledger-disclosure">Saving stores the signed-in email, optional reviewer email, submitted regional model and computed result in hosted durable storage. Synthetic data only—do not save resident identity, confidential operator data or authoritative road records in this prototype.</p>
        <p className="ledger-message" aria-live="polite">{ledgerMessage}</p>
        <div className="ledger-list">
          {ledgerRuns.slice(0, 5).map((run) => (
            <article key={run.id}>
              <header><span className={`run-status ${run.status}`}>{run.status.replace("_", " ")}</span><div><b>{run.scenarioLabel}</b><small>{new Date(run.createdAt).toLocaleString()} · {run.role}</small></div><em>{run.optimalityCertified ? "EXACT" : "FEASIBLE"}</em></header>
              <div className="run-metrics"><span><b>{run.metrics.householdCoveragePercent}%</b><small>households</small></span><span><b>{run.metrics.vulnerableCoveragePercent}%</b><small>vulnerable</small></span><span><b>{run.metrics.criticalFailures}</b><small>critical gaps</small></span><span><b>{run.metrics.totalDistanceKm} km</b><small>distance</small></span></div>
              <p>{run.changeSummary.baseline ? "First recorded baseline" : `${signed(run.changeSummary.householdCoverageDelta)} access · ${signed(run.changeSummary.distanceKmDelta)} km · ${run.changeSummary.routeVehiclesChanged} vehicle routes changed`}</p>
              <footer><code>{run.inputDigest.slice(0, 24)}…</code><button type="button" onClick={() => void verifyAudit(run.id)}>Verify audit</button>{run.role === "reviewer" && run.status === "review_pending" ? <><button className="approve" type="button" onClick={() => void reviewRun(run.id, "approved")}>Approve</button><button className="reject" type="button" onClick={() => void reviewRun(run.id, "rejected")}>Reject</button></> : null}</footer>
            </article>
          ))}
          {ledgerRuns.length === 0 ? <div className="ledger-empty"><b>No durable run recorded</b><span>The optimizer remains usable. Saving requires an authenticated, initialized ledger.</span></div> : null}
        </div>
      </section>

      <footer className="site-footer regional-footer">
        <p>Fictional district and modeled probabilities · Advisory planning only · No autonomous road or dispatch authority</p>
        <p>Regional Access OS · Japan-first wedge, globally portable engine</p>
      </footer>
    </main>
  );
}

function roundPercent(value: number) {
  return value.toFixed(1);
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}
