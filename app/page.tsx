"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_NEEDS,
  VEHICLES,
  applyDecisionAnswer,
  buildDecisionAnalysis,
  buildResilienceAnalysis,
  buildUnsafeCandidate,
  buildVerifiedPlan,
  type Assignment,
  type DecisionAnalysis,
  type DecisionAnswerId,
  type DispatchPlan,
  type PowerNeed,
  type ResilienceAnalysis,
} from "@/lib/planner";
import {
  buildEvidencePackage,
  evaluateOperationalReadiness,
  verifyEvidencePackage,
  type AuditEvent,
  type EvidenceCore,
} from "@/lib/operations";
import RegionalAccess from "./regional-access";

type Stage = "intake" | "candidate" | "clarify" | "verified" | "hardened" | "approved" | "authorized" | "rerouted";
type AiMode = "ready" | "gpt-5.6" | "demo-fallback";

const stageIndex: Record<Stage, number> = {
  intake: 0,
  candidate: 1,
  clarify: 2,
  verified: 3,
  hardened: 4,
  approved: 5,
  authorized: 6,
  rerouted: 7,
};

const actionLabels: Record<Stage, string> = {
  intake: "Analyze reports with GPT-5.6",
  candidate: "Rank decision-critical questions",
  clarify: "Confirm answer + optimize",
  verified: "Eliminate single points of failure",
  hardened: "Approve simulated dispatch",
  approved: "Safety Officer co-sign",
  authorized: "Interpret bridge closure + re-plan",
  rerouted: "Reset training scenario",
};

const actionSubtitles: Record<Stage, string> = {
  intake: "Narrative → power contracts",
  candidate: "Exact counterfactual value-of-information",
  clarify: "Human fact check → robust optimum",
  verified: "Exact N-1 search → minimum intervention",
  hardened: "Human decision required",
  approved: "Independent dual control required",
  authorized: "Free text event → new optimum",
  rerouted: "Replay the full mission loop",
};

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

const LEAD_APPROVAL = {
  actorId: "incident-lead-04",
  role: "incident-lead" as const,
  approvedAt: "2026-07-19T02:19:00Z",
  scope: "synthetic-dispatch-v1",
};

const SAFETY_APPROVAL = {
  actorId: "safety-officer-02",
  role: "safety-officer" as const,
  approvedAt: "2026-07-19T02:20:00Z",
  scope: "synthetic-dispatch-v1",
};

function buildOperationalAuditEvents(
  stage: Stage,
  aiMode: AiMode,
  decision: DecisionAnalysis,
  decisionAnswer: DecisionAnswerId,
  plan: DispatchPlan,
  resilience: ResilienceAnalysis | null,
  eventMode: AiMode,
): AuditEvent[] {
  const completed = stageIndex[stage];
  const events: AuditEvent[] = [
    {
      type: "incident.received",
      actorId: "operator-17",
      actorRole: "field-operator",
      occurredAt: "2026-07-19T02:14:00Z",
      summary: "Three synthetic facility reports received",
      evidence: { reportCount: 3, simulationOnly: true },
    },
  ];

  if (completed >= stageIndex.candidate) events.push({
    type: "reports.structured",
    actorId: aiMode === "gpt-5.6" ? "gpt-5.6" : "synthetic-fallback",
    actorRole: "language-interpreter",
    occurredAt: "2026-07-19T02:15:00Z",
    summary: "Narrative reports converted to source-linked power contracts",
    evidence: { mode: aiMode, contractCount: 3 },
  });
  if (completed >= stageIndex.clarify) events.push({
    type: "decision.question-ranked",
    actorId: "decision-critical-planner",
    actorRole: "deterministic-service",
    occurredAt: "2026-07-19T02:16:00Z",
    summary: "Highest-value operator question identified",
    evidence: {
      questionId: decision.topQuestion.id,
      avoidableFailures: decision.topQuestion.avoidableViolationScenarios,
      evaluations: decision.counterfactualPlanScenarioEvaluations,
    },
  });
  if (completed >= stageIndex.verified) {
    events.push({
      type: "decision.fact-verified",
      actorId: "operator-17",
      actorRole: "field-operator",
      occurredAt: "2026-07-19T02:17:00Z",
      summary: "Decision-critical fact verified by a human operator",
      evidence: { questionId: decision.topQuestion.id, answerId: decisionAnswer },
    });
    events.push({
      type: "plan.robust-optimized",
      actorId: "robust-optimizer",
      actorRole: "deterministic-service",
      occurredAt: "2026-07-19T02:18:00Z",
      summary: "Exact allocation passed physical and uncertainty checks",
      evidence: {
        candidatePlans: plan.optimization?.candidatePlans ?? 0,
        stressSuccessRate: plan.optimization?.optimized.successRate ?? 0,
      },
    });
  }
  if (completed >= stageIndex.hardened && resilience) events.push({
    type: "plan.n-minus-one-hardened",
    actorId: "resilience-planner",
    actorRole: "deterministic-service",
    occurredAt: "2026-07-19T02:18:30Z",
    summary: "Minimum-intervention N-1 action selected",
    evidence: {
      actionId: resilience.selectedAction.id,
      protected: resilience.selectedAction.protectedContingencies,
      total: resilience.contingencyCount,
    },
  });
  if (completed >= stageIndex.approved) events.push({
    type: "dispatch.lead-approved",
    actorId: LEAD_APPROVAL.actorId,
    actorRole: LEAD_APPROVAL.role,
    occurredAt: LEAD_APPROVAL.approvedAt,
    summary: "Incident Lead approved the synthetic dispatch scope",
    evidence: { scope: LEAD_APPROVAL.scope },
  });
  if (completed >= stageIndex.authorized) events.push({
    type: "dispatch.countersigned",
    actorId: SAFETY_APPROVAL.actorId,
    actorRole: SAFETY_APPROVAL.role,
    occurredAt: SAFETY_APPROVAL.approvedAt,
    summary: "Independent Safety Officer co-signed the synthetic dispatch",
    evidence: { scope: SAFETY_APPROVAL.scope, separateActor: true },
  });
  if (stage === "rerouted") events.push({
    type: "route.blocked-and-replanned",
    actorId: eventMode === "gpt-5.6" ? "gpt-5.6" : "synthetic-fallback",
    actorRole: "event-interpreter",
    occurredAt: "2026-07-19T02:23:00Z",
    summary: "East Bridge closure became machine state and triggered a global re-plan",
    evidence: { blockedRouteId: "east-bridge", mode: eventMode },
  });
  return events;
}

function routePath(assignment: Assignment) {
  const { vehicle, need } = assignment;
  const controlX = (vehicle.x + need.x) / 2;
  const controlY = Math.min(vehicle.y, need.y) - 8;
  return `M ${vehicle.x} ${vehicle.y} Q ${controlX} ${controlY} ${need.x} ${need.y}`;
}

function proofRows(
  stage: Stage,
  plan: DispatchPlan,
  decision: DecisionAnalysis,
  preClosurePlan: DispatchPlan | null,
  resilience: ResilienceAnalysis | null,
) {
  if (stage === "intake") {
    return [
      { state: "pending", label: "Power contracts", detail: "Waiting for structured intake" },
      { state: "pending", label: "Physical feasibility", detail: "No candidate evaluated" },
      { state: "pending", label: "Mobility reserve", detail: "35% hard floor enabled" },
      { state: "pending", label: "Human approval", detail: "Required before dispatch" },
    ];
  }

  if (stage === "candidate") {
    const blocked = plan.assignments.find((assignment) => !assignment.safe)!;
    const connector = blocked.checks.find((check) => check.code === "connector")!;
    const duration = blocked.checks.find((check) => check.code === "duration")!;
    const reserve = blocked.checks.find((check) => check.code === "reserve")!;
    return [
      { state: connector.pass ? "pass" : "fail", label: connector.label, detail: connector.detail },
      { state: duration.pass ? "pass" : "fail", label: duration.label, detail: duration.detail },
      { state: reserve.pass ? "pass" : "fail", label: reserve.label, detail: reserve.detail },
      { state: "pending", label: "Human approval", detail: "Blocked until every constraint passes" },
    ];
  }

  if (stage === "clarify") {
    const question = decision.topQuestion;
    return [
      { state: "pass", label: "Question search", detail: `${decision.questionCount} uncertainties ranked exactly` },
      { state: "pending", label: "Highest-value fact", detail: `${question.facility} · ${question.fieldLabel}` },
      { state: "fail", label: "Cost of guessing", detail: `${question.avoidableViolationScenarios} avoidable scenario failures` },
      { state: "pending", label: "Operator verification", detail: "One fact required before optimization" },
    ];
  }

  if (stage === "rerouted") {
    const water = plan.assignments.find((assignment) => assignment.need.id === "water")!;
    const stress = plan.optimization?.optimized;
    const affected = preClosurePlan?.assignments.find((assignment) => assignment.route.routeId === "east-bridge");
    const missionChanges = preClosurePlan?.assignments.filter((before) => (
      plan.assignments.find((after) => after.need.id === before.need.id)?.vehicle.id !== before.vehicle.id
    )).length ?? 0;
    return [
      affected
        ? { state: "fail", label: "Original mission state", detail: `East Bridge invalidated ${affected.vehicle.id} → ${affected.need.facility}` }
        : { state: "pass", label: "Original mission state", detail: "No active mission depended on East Bridge" },
      { state: "pass", label: "Global re-optimization", detail: missionChanges > 0 ? `${missionChanges} missions rebuilt · ${water.vehicle.id} → Water` : "Recomputed globally · no mission change required" },
      { state: "pass", label: "Uncertainty stress test", detail: `${stress?.successRate ?? 0}% success across ${stress?.scenarioCount ?? 0} scenarios` },
      { state: resilience?.selectedAction.nMinusOneCertified ? "pass" : "pending", label: "N-1 recovery library", detail: `${resilience?.selectedAction.protectedContingencies ?? 0}/${resilience?.contingencyCount ?? 0} single failures protected` },
      { state: "pass", label: "Dual human authority", detail: "Lead approval and independent co-sign remain in scope" },
    ];
  }

  const evidence = plan.optimization;
  if (stage === "verified") {
    return [
      { state: "pass", label: "Decision-critical fact", detail: `${decision.topQuestion.fieldLabel} verified by operator` },
      { state: "pass", label: "Robust allocation", detail: `${evidence?.optimized.successRate ?? 0}% across ${evidence?.scenarioCount ?? 0} uncertainty scenarios` },
      { state: "fail", label: "Single-point exposure", detail: `${resilience?.weakestBaselineCases.length ?? 0} failures can break critical protection` },
      { state: "pending", label: "Minimum intervention", detail: resilience?.selectedAction.label ?? "Contingency search pending" },
      { state: "pending", label: "Human approval", detail: "Blocked until resilience action is reviewed" },
    ];
  }

  const nMinusOneCertified = resilience?.selectedAction.nMinusOneCertified ?? false;
  return [
    { state: "pass", label: "Decision-critical fact", detail: `${decision.topQuestion.fieldLabel} verified by operator` },
    { state: "pass", label: "Exact allocation search", detail: `${evidence?.candidatePlans ?? 0} of ${evidence?.candidatePlans ?? 0} allocations evaluated` },
    { state: nMinusOneCertified ? "pass" : "fail", label: "N-1 resilience", detail: `${resilience?.selectedAction.protectedContingencies ?? 0}/${resilience?.contingencyCount ?? 0} single failures protect critical service` },
    { state: "pass", label: "Minimum intervention", detail: `${resilience?.selectedAction.label ?? "None"} · ${resilience?.selectedAction.actionCostLabel ?? "not scored"}` },
    stageIndex[stage] >= stageIndex.approved
      ? { state: "pass", label: "Lead approval", detail: `${LEAD_APPROVAL.actorId} · synthetic scope` }
      : { state: "pending", label: "Lead approval", detail: "Required before simulated dispatch" },
    stageIndex[stage] >= stageIndex.authorized
      ? { state: "pass", label: "Independent co-sign", detail: `${SAFETY_APPROVAL.actorId} · distinct role verified` }
      : { state: "pending", label: "Independent co-sign", detail: "Safety Officer must be a different actor" },
  ];
}

function statusForVehicle(
  vehicleId: string,
  stage: Stage,
  plan: DispatchPlan,
  reserveVehicleId?: string,
) {
  const assignment = plan.assignments.find((item) => item.vehicle.id === vehicleId);
  if (!assignment && stageIndex[stage] >= stageIndex.hardened && vehicleId === reserveVehicleId) return "standby";
  if (!assignment || stage === "intake") return "idle";
  if (!assignment.safe) return "risk";
  if (stage === "authorized" || stage === "rerouted") return "dispatched";
  return "assigned";
}

export default function Home() {
  const [productMode, setProductMode] = useState<"regional" | "emergency">("regional");
  const [stage, setStage] = useState<Stage>("intake");
  const [needs, setNeeds] = useState<PowerNeed[]>(DEFAULT_NEEDS);
  const [resolvedNeeds, setResolvedNeeds] = useState<PowerNeed[] | null>(null);
  const [decisionAnswer, setDecisionAnswer] = useState<DecisionAnswerId>("confirmed");
  const [aiMode, setAiMode] = useState<AiMode>("ready");
  const [eventMode, setEventMode] = useState<AiMode>("ready");
  const [eventSummary, setEventSummary] = useState("East Bridge closure awaiting interpretation");
  const [working, setWorking] = useState(false);
  const [evidenceHash, setEvidenceHash] = useState("");
  const [evidenceStatus, setEvidenceStatus] = useState<"idle" | "building" | "verified" | "error">("idle");
  const decision = useMemo(() => buildDecisionAnalysis(needs), [needs]);
  const selectedDecisionOption = decision.topQuestion.options.find((option) => option.id === decisionAnswer)!;
  const activeNeeds = resolvedNeeds ?? needs;
  const completed = stageIndex[stage];
  const isStructured = completed >= stageIndex.candidate;
  const isProvisional = completed >= stageIndex.clarify;
  const isVerified = completed >= stageIndex.verified;
  const isHardened = completed >= stageIndex.hardened;
  const isApproved = completed >= stageIndex.approved;
  const isAuthorized = completed >= stageIndex.authorized;
  const isRerouted = stage === "rerouted";
  const shouldAnalyzeResilience = completed >= stageIndex.verified;

  const plan = useMemo(() => {
    if (stage === "intake" || stage === "candidate") return buildUnsafeCandidate(needs);
    return buildVerifiedPlan(stage === "rerouted" ? ["east-bridge"] : [], activeNeeds);
  }, [activeNeeds, needs, stage]);
  const preClosurePlan = useMemo(
    () => stage === "rerouted" ? buildVerifiedPlan([], activeNeeds) : null,
    [activeNeeds, stage],
  );
  const resilience = useMemo(
    () => shouldAnalyzeResilience ? buildResilienceAnalysis(activeNeeds) : null,
    [activeNeeds, shouldAnalyzeResilience],
  );
  const readiness = useMemo(() => evaluateOperationalReadiness({
    dataMode: aiMode,
    decisionVerified: isVerified,
    planSafe: isVerified && plan.allNeedsServed,
    stressSuccessRate: isVerified ? plan.optimization?.optimized.successRate ?? 0 : 0,
    nMinusOneProtected: isHardened ? resilience?.selectedAction.protectedContingencies ?? 0 : 0,
    contingencyCount: resilience?.contingencyCount ?? 0,
    leadApproval: isApproved ? LEAD_APPROVAL : undefined,
    safetyApproval: isAuthorized ? SAFETY_APPROVAL : undefined,
    telemetryMode: "synthetic",
    hardwareCertified: false,
    securityReviewComplete: false,
    fieldAuthorityGranted: false,
    fieldValidationComplete: false,
    simulationOnly: true,
  }), [aiMode, isApproved, isAuthorized, isHardened, isVerified, plan, resilience]);
  const auditEvents = useMemo(() => buildOperationalAuditEvents(
    stage,
    aiMode,
    decision,
    decisionAnswer,
    plan,
    resilience,
    eventMode,
  ), [aiMode, decision, decisionAnswer, eventMode, plan, resilience, stage]);
  const rerouteMissionChanges = preClosurePlan?.assignments.filter((before) => (
    plan.assignments.find((after) => after.need.id === before.need.id)?.vehicle.id !== before.vehicle.id
  )).length ?? 0;

  const rows = proofRows(stage, plan, decision, preClosurePlan, resilience);
  const evidence = plan.optimization;

  const metrics = stage === "intake"
    ? { protection: "0.0", unserved: "24.0", violations: "—", robustness: "—", nMinusOne: "—" }
    : {
        protection: plan.criticalSiteHours.toFixed(1),
        unserved: plan.unservedCriticalKwh.toFixed(1),
        violations: String(plan.violationCount),
        robustness: completed >= stageIndex.clarify ? (evidence?.optimized.successRate ?? 0).toFixed(1) : "0.0",
        nMinusOne: isVerified
          ? `${isHardened ? resilience?.selectedAction.protectedContingencies ?? 0 : resilience?.baseline.protectedContingencies ?? 0}/${resilience?.contingencyCount ?? 0}`
          : "—",
      };

  function resetScenario() {
    setStage("intake");
    setAiMode("ready");
    setEventMode("ready");
    setEventSummary("East Bridge closure awaiting interpretation");
    setNeeds(DEFAULT_NEEDS);
    setResolvedNeeds(null);
    setDecisionAnswer("confirmed");
    setEvidenceHash("");
    setEvidenceStatus("idle");
  }

  async function downloadEvidencePackage() {
    if (!readiness.simulationReady || !resilience) return;
    setEvidenceStatus("building");
    try {
      const core: EvidenceCore = {
        incident: {
          id: "LG-SIM-2026-0719-001",
          title: "Regional outage training scenario",
          scenario: "Synthetic OpenAI Build Week demonstration",
          simulationOnly: true,
        },
        source: {
          dataMode: aiMode,
          model: aiMode === "gpt-5.6" ? "gpt-5.6" : "synthetic-fallback",
          sourceLinked: true,
        },
        decision: {
          questionId: decision.topQuestion.id,
          answer: selectedDecisionOption.label,
          verifiedBy: "operator-17",
        },
        plan: {
          assignments: plan.assignments.map((assignment) => ({
            vehicleId: assignment.vehicle.id,
            needId: assignment.need.id,
            routeId: assignment.route.routeId,
            postMissionSoc: assignment.postMissionSoc,
            safe: assignment.safe,
          })),
          stressSuccessRate: plan.optimization?.optimized.successRate ?? 0,
          scenarioCount: plan.optimization?.scenarioCount ?? 0,
          candidatePlans: plan.optimization?.candidatePlans ?? 0,
        },
        resilience: {
          selectedActionId: resilience.selectedAction.id,
          selectedAction: resilience.selectedAction.label,
          protectedContingencies: resilience.selectedAction.protectedContingencies,
          contingencyCount: resilience.contingencyCount,
          nMinusOneCertified: resilience.selectedAction.nMinusOneCertified,
        },
        readiness,
      };
      const evidencePackage = await buildEvidencePackage(core, auditEvents, new Date().toISOString());
      if (!(await verifyEvidencePackage(evidencePackage))) throw new Error("Evidence verification failed");
      const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lifeline-grid-LG-SIM-2026-0719-001-evidence.json";
      link.click();
      URL.revokeObjectURL(url);
      setEvidenceHash(evidencePackage.packageHash);
      setEvidenceStatus("verified");
    } catch {
      setEvidenceStatus("error");
    }
  }

  async function analyzeReports() {
    setWorking(true);
    setResolvedNeeds(null);
    setDecisionAnswer("confirmed");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: DEFAULT_NEEDS.map((need) => `${need.id}: ${need.report}`).join("\n"),
        }),
      });
      if (!response.ok) throw new Error("Analysis unavailable");
      const payload = await response.json() as { mode?: AiMode; needs?: PowerNeed[] };
      if (Array.isArray(payload.needs) && payload.needs.length === 3) setNeeds(payload.needs);
      setAiMode(payload.mode === "gpt-5.6" ? "gpt-5.6" : "demo-fallback");
    } catch {
      setNeeds(DEFAULT_NEEDS);
      setAiMode("demo-fallback");
    }
    await wait(300);
    setStage("candidate");
    setWorking(false);
  }

  async function advance() {
    if (stage === "intake") {
      await analyzeReports();
      return;
    }
    setWorking(true);
    await wait(stage === "candidate" ? 620 : stage === "clarify" ? 520 : stage === "verified" ? 680 : 360);
    if (stage === "candidate") setStage("clarify");
    if (stage === "clarify") {
      setResolvedNeeds(applyDecisionAnswer(needs, decision.topQuestion, decisionAnswer));
      setStage("verified");
    }
    if (stage === "verified") setStage("hardened");
    if (stage === "hardened") setStage("approved");
    if (stage === "approved") setStage("authorized");
    if (stage === "authorized") {
      try {
        const response = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report: "Road operations reports: East Bridge is closed to all traffic after a structural inspection. Use alternate routes until further notice.",
          }),
        });
        if (!response.ok) throw new Error("Event interpretation unavailable");
        const payload = await response.json() as {
          mode?: AiMode;
          event?: { operatorSummary?: string; blockedRouteIds?: string[] };
        };
        setEventMode(payload.mode === "gpt-5.6" ? "gpt-5.6" : "demo-fallback");
        setEventSummary(payload.event?.operatorSummary ?? "East Bridge is unavailable for the current planning window.");
      } catch {
        setEventMode("demo-fallback");
        setEventSummary("East Bridge is unavailable for the current planning window.");
      }
      setStage("rerouted");
    }
    if (stage === "rerouted") {
      resetScenario();
    }
    setWorking(false);
  }

  const proofTone = stage === "candidate" ? "blocked" : stage === "clarify" ? "question" : stage === "intake" ? "waiting" : stage === "verified" ? "exposed" : "verified";
  const proofLabel = stage === "candidate" ? "BLOCKED" : stage === "clarify" ? "FACT CHECK" : stage === "intake" ? "WAITING" : stage === "verified" ? `${resilience?.weakestBaselineCases.length ?? 0} GAPS` : stage === "rerouted" ? "RE-PLANNED" : stage === "approved" ? "LEAD APPROVED" : stage === "authorized" ? "CO-SIGNED" : resilience?.selectedAction.nMinusOneCertified ? "N-1 READY" : "MAXIMIZED";
  const modeLabel = aiMode === "gpt-5.6" ? "GPT-5.6 LIVE" : aiMode === "demo-fallback" ? "DEMO FALLBACK" : "UNSTRUCTURED";
  const actionSubtitle = stage === "clarify" ? selectedDecisionOption.label : actionSubtitles[stage];

  if (productMode === "regional") {
    return <RegionalAccess onSwitchToEmergency={() => setProductMode("emergency")} />;
  }

  return (
    <main className={`command-shell stage-${stage}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className="brand-name">Lifeline Grid</p>
            <p className="brand-tagline">Verified mobile power coordination</p>
          </div>
        </div>
        <div className="topbar-actions">
          <nav className="product-switch" aria-label="Product mode">
            <button type="button" onClick={() => setProductMode("regional")}>Regional access</button>
            <button className="active" type="button" aria-current="page">Emergency grid</button>
          </nav>
          <span className="simulation-pill"><i /> Synthetic scenario</span>
          <span className="incident-clock">INCIDENT 02:14:37</span>
        </div>
      </header>

      <section className="mission-heading">
        <div>
          <p className="eyebrow">REGIONAL OUTAGE · RESPONSE ACTIVE</p>
          <h1>Turn stranded batteries into a verified emergency grid.</h1>
          <p className="mission-deck">GPT-5.6 understands the need. A deterministic safety kernel proves the plan. A human stays in command.</p>
        </div>
        <div className="action-lockup">
          <button className="primary-action" data-testid="primary-action" type="button" onClick={advance} disabled={working}>
            <span className="action-copy">
              <b>{working ? "Processing mission state…" : actionLabels[stage]}</b>
              <small>{working ? "Every hard constraint remains enforced" : actionSubtitle}</small>
            </span>
            <span className="action-arrow" aria-hidden="true">→</span>
          </button>
          {stage !== "intake" && (
            <button className="reset-action" type="button" onClick={resetScenario}>
              Reset
            </button>
          )}
        </div>
      </section>

      <section className="metric-grid" aria-label="Mission metrics" aria-live="polite">
        <article className={`metric-card ${isVerified ? "positive" : stage === "clarify" ? "provisional" : ""}`}>
          <p>Critical protection</p>
          <div><strong>{metrics.protection}</strong><span>site-h</span></div>
          <small className={isVerified ? "metric-ok" : "metric-warning"}>{isVerified ? "Full 12 h target protected" : stage === "clarify" ? "Provisional · one fact unresolved" : "12 h target across critical sites"}</small>
        </article>
        <article className={`metric-card ${isVerified ? "positive" : stage === "clarify" ? "provisional" : ""}`}>
          <p>Unserved critical energy</p>
          <div><strong>{metrics.unserved}</strong><span>kWh</span></div>
          <small className={isVerified ? "metric-ok" : "metric-warning"}>{isVerified ? "All critical demand covered" : stage === "clarify" ? "Conditional on operator answer" : "Power gap remains"}</small>
        </article>
        <article className={`metric-card ${stage === "candidate" ? "danger" : isVerified ? "positive" : stage === "clarify" ? "provisional" : ""}`}>
          <p>Safety violations</p>
          <div><strong>{metrics.violations}</strong><span>{stage === "candidate" ? "blocked" : "hard gates"}</span></div>
          <small className={stage === "candidate" ? "metric-danger" : isVerified ? "metric-ok" : stage === "clarify" ? "metric-warning" : ""}>{stage === "candidate" ? "Unsafe dispatch prevented" : isVerified ? "Deterministic proof passed" : stage === "clarify" ? "Guessing remains blocked" : "Awaiting candidate plan"}</small>
        </article>
        <article className={`metric-card accent-card ${isVerified ? "positive" : stage === "clarify" ? "provisional" : ""}`}>
          <p>Plan robustness</p>
          <div><strong>{metrics.robustness}</strong><span>{isProvisional ? "% success" : "stress suite"}</span></div>
          <small className={isVerified ? "metric-ok" : stage === "clarify" ? "metric-warning" : ""}>{isVerified ? "256 bounded uncertainty scenarios" : stage === "clarify" ? "Provisional plan only" : "Demand · SoC · travel uncertainty"}</small>
        </article>
        <article className={`metric-card resilience-card ${stage === "verified" ? "danger" : isHardened ? "positive" : ""}`}>
          <p>Single-failure recovery</p>
          <div><strong>{metrics.nMinusOne}</strong><span>N-1 cases</span></div>
          <small className={stage === "verified" ? "metric-danger" : isHardened ? "metric-ok" : ""}>{stage === "verified" ? `${resilience?.weakestBaselineCases.length ?? 0} hidden single points detected` : isHardened ? resilience?.selectedAction.nMinusOneCertified ? "Every modeled single failure protected" : "Best attainable protection shown honestly" : "Vehicles · roads · reserve actions"}</small>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel map-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">LIVE RESOURCE GRAPH</p>
              <h2>Mission map</h2>
            </div>
            <div className="map-legend">
              <span><i className="legend-site" /> Critical site</span>
              <span><i className="legend-vehicle" /> Mobile source</span>
              <span><i className="legend-route" /> Verified route</span>
            </div>
          </div>

          <div className="mission-map" aria-label="Synthetic mission map">
            <div className="map-grid" />
            <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="road-line" d="M 2 44 C 28 38, 52 48, 98 34" />
              <path className="road-line" d="M 50 2 C 46 24, 58 55, 54 98" />
              <path className="road-line minor" d="M 4 82 C 25 67, 70 78, 98 60" />
              {isStructured && plan.assignments.map((assignment) => (
                <path
                  className={`route-line ${assignment.safe ? "route-safe" : "route-risk"}`}
                  d={routePath(assignment)}
                  key={`${assignment.vehicle.id}-${assignment.need.id}`}
                />
              ))}
              {isRerouted && (
                <path className="route-line route-closed" d="M 66 55 Q 77 53 86 68" />
              )}
            </svg>

            {activeNeeds.map((need) => (
              <div className={`site-node ${need.priority}`} key={need.id} style={{ left: `${need.x}%`, top: `${need.y}%` }}>
                <span className="site-pulse" />
                <div><b>{need.facility}</b><small>{need.powerKw.toFixed(1)} kW · {need.durationHours} h</small></div>
              </div>
            ))}

            {VEHICLES.map((vehicle) => {
              const status = statusForVehicle(vehicle.id, stage, plan, resilience?.selectedAction.reserveVehicleId);
              return (
                <div className={`vehicle-node ${status}`} key={vehicle.id} style={{ left: `${vehicle.x}%`, top: `${vehicle.y}%` }}>
                  <span className="vehicle-icon" aria-hidden="true">◆</span>
                  <div><b>{vehicle.id}</b><small>{vehicle.soc}% SoC</small></div>
                </div>
              );
            })}

            {isRerouted && <div className="bridge-closure"><span>×</span><b>BRIDGE CLOSED</b></div>}
            {isHardened && resilience?.selectedAction.reserveVehicleId && (
              <div className="reserve-staging"><span>◇</span><b>{resilience.selectedAction.reserveVehicleId} N-1 RESERVE</b></div>
            )}

            <div className={`map-note ${stage === "candidate" ? "risk-note" : stage === "clarify" ? "question-note" : isVerified ? "safe-note" : "waiting-note"}`}>
              <span>{stage === "candidate" ? "!" : stage === "clarify" ? "?" : isVerified ? "✓" : "···"}</span>
              <div>
                <b>{stage === "intake" && "Three reports are waiting for structured intake"}</b>
                <b>{stage === "candidate" && "E-12 cannot complete the Clinic mission"}</b>
                <b>{stage === "clarify" && "One unresolved fact can change two missions"}</b>
                <b>{stage === "verified" && "Robust plan has two hidden single points"}</b>
                <b>{stage === "hardened" && "Minimum-intervention N-1 plan certified"}</b>
                <b>{stage === "approved" && "Incident Lead approved; independent co-sign required"}</b>
                <b>{stage === "authorized" && "Two-person simulation authorization complete"}</b>
                <b>{stage === "rerouted" && "Closure absorbed by a whole-plan re-optimization"}</b>
                <small>{stage === "candidate" ? "Duration and mobility reserve both fail" : stage === "clarify" ? `${decision.counterfactualPlanScenarioEvaluations.toLocaleString()} counterfactual evaluations · guessing blocked` : stage === "verified" ? `${resilience?.totalPlanScenarioEvaluations.toLocaleString() ?? 0} contingency evaluations found ${resilience?.weakestBaselineCases.length ?? 0} gaps` : stage === "hardened" ? `${resilience?.selectedAction.label} · ${resilience?.selectedAction.protectedContingencies}/${resilience?.contingencyCount} protected` : stage === "approved" ? "Lead approval recorded · Safety Officer remains pending" : stage === "authorized" ? `${readiness.missionPassed}/${readiness.missionTotal} mission gates pass · field deployment remains blocked` : stage === "rerouted" ? rerouteMissionChanges > 0 ? `${rerouteMissionChanges} missions changed; every hard constraint rechecked` : "No active route affected; whole plan still recomputed" : stage === "intake" ? "No dispatch decision has been made" : `${evidence?.scenarioEvaluations.toLocaleString() ?? 0} plan-scenario evaluations · no relaxed constraints`}</small>
              </div>
            </div>
          </div>

          <div className="assignment-strip" aria-label="Dispatch assignments">
            {stage === "intake" ? (
              <div className="pipeline-preview">
                <span><i>1</i><b>Understand</b><small>GPT-5.6 structures reports</small></span>
                <em>→</em>
                <span><i>2</i><b>Ask</b><small>Value-of-information ranking</small></span>
                <em>→</em>
                <span><i>3</i><b>Prove</b><small>Exact robust optimization</small></span>
                <em>→</em>
                <span><i>4</i><b>Survive</b><small>N-1 contingency proof</small></span>
                <em>→</em>
                <span><i>5</i><b>Act</b><small>Human approves simulation</small></span>
              </div>
            ) : plan.assignments.map((assignment) => (
              <div className={`assignment-card ${assignment.safe ? "safe" : "blocked"}`} key={assignment.need.id}>
                <div className="assignment-route"><b>{assignment.vehicle.id}</b><span>→</span><b>{assignment.need.facility}</b></div>
                <div className="assignment-detail">
                  <span>{assignment.route.oneWayMinutes} min</span>
                  <span>{assignment.coverageHours.toFixed(1)} h cover</span>
                  <span>{assignment.postMissionSoc.toFixed(1)}% after</span>
                </div>
                <small>{assignment.safe ? isRerouted ? "RE-OPTIMIZED" : isHardened ? "N-1 PRIMARY" : stage === "clarify" ? "PROVISIONAL" : "ROBUST" : "BLOCKED"}</small>
              </div>
            ))}
          </div>
        </article>

        <aside className="right-rail">
          {stage === "clarify" ? (
            <article className="panel decision-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="panel-kicker">DECISION INTELLIGENCE</p>
                  <h2>Ask before dispatch</h2>
                </div>
                <span className="question-rank">RANK #1 / {decision.questionCount}</span>
              </div>
              <div className="decision-body">
                <span className="decision-hold">DISPATCH HOLD · ONE FACT MATTERS MOST</span>
                <h3>{decision.topQuestion.question}</h3>
                <p className="decision-assumption">Current assumption: “{decision.topQuestion.assumption}”</p>
                <div className="question-impact" aria-label="Value of information evidence">
                  <span><b>{decision.topQuestion.avoidableViolationScenarios}</b><small>avoidable failures</small></span>
                  <span><b>{decision.topQuestion.assignmentChanges}</b><small>missions can change</small></span>
                  <span><b>{decision.counterfactualPlanScenarioEvaluations.toLocaleString()}</b><small>counterfactual evals</small></span>
                </div>
                <div className="question-options" role="radiogroup" aria-label={decision.topQuestion.question}>
                  {decision.topQuestion.options.map((option) => (
                    <button
                      className={decisionAnswer === option.id ? "selected" : ""}
                      type="button"
                      role="radio"
                      aria-checked={decisionAnswer === option.id}
                      onClick={() => setDecisionAnswer(option.id)}
                      key={option.id}
                    >
                      <span>{decisionAnswer === option.id ? "●" : "○"}</span>
                      <div>
                        <b>{option.label}</b>
                        <small>{option.detail}</small>
                        <em>{option.assignments.water} → Water · {option.assignments.shelter} → Shelter</em>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="decision-method">Exact value-of-information ranking · equal-weight fictional counterfactuals · no guessed fact can authorize dispatch</p>
              </div>
            </article>
          ) : (
            <article className="panel incident-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="panel-kicker">GPT-5.6 INTAKE</p>
                  <h2>Incident reports</h2>
                </div>
                <span className={`mode-badge ${aiMode}`}>{modeLabel}</span>
              </div>
              <div className="incident-list">
                {activeNeeds.map((need, index) => (
                  <div className={`incident-item ${need.priority}`} key={need.id}>
                    <div className="incident-meta"><b>{need.facility}</b><span>02:{11 + index}</span></div>
                    <p>{isStructured ? need.summary : need.report}</p>
                    {isStructured && (
                      <div className="contract-row">
                        <span>{need.priority.toUpperCase()}</span>
                        <span>{need.peakPowerKw && need.peakPowerKw > need.powerKw ? `${need.powerKw.toFixed(1)} avg · ${need.peakPowerKw.toFixed(1)} peak` : `${need.powerKw.toFixed(1)} kW × ${need.durationHours} h`}</span>
                        <span>{need.connector}</span>
                        <span>CONF. {Math.round(need.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isStructured && <p className="source-proof">Source-linked contracts · Assumptions remain explicit</p>}
            </article>
          )}

          <article className="panel proof-panel">
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">ROBUST OPTIMIZATION KERNEL</p>
                <h2>Machine-checkable proof</h2>
              </div>
              <span className={`proof-status ${proofTone}`}>{proofLabel}</span>
            </div>
            <ul className="proof-list" aria-live="polite">
              {rows.map((row) => (
                <li className={row.state} key={row.label}>
                  <span>{row.state === "pass" ? "✓" : row.state === "fail" ? "×" : "•"}</span>
                  <div><b>{row.label}</b><small>{row.detail}</small></div>
                </li>
              ))}
            </ul>
            {evidence && (
              <div className="optimizer-facts" aria-label="Optimization evidence">
                <span><b>{evidence.candidatePlans}</b><small>exact allocations</small></span>
                <span><b>{evidence.scenarioEvaluations.toLocaleString()}</b><small>plan-scenarios</small></span>
                <span><b>{evidence.robustFeasiblePlans}</b><small>robust optima set</small></span>
                <span><b>✓</b><small>optimality certified</small></span>
              </div>
            )}
            <div className="decision-boundary">
              <span><b>AI</b> interprets</span><i>→</i><span><b>Optimizer</b> proves</span><i>→</i><span><b>Human</b> authorizes</span>
            </div>
          </article>
        </aside>
      </section>

      {evidence && (
        <section className="panel benchmark-panel" aria-label="Planning strategy benchmark">
          <div className="benchmark-heading">
            <div>
              <p className="panel-kicker">LIVE EVALUATION · NOT A CLAIM</p>
              <h2>Why the plan beats “send the nearest”—and survives one failure</h2>
            </div>
            <div className="uncertainty-bounds">
              <span>DEMAND {evidence.adversarialBounds.demand}</span>
              <span>SoC {evidence.adversarialBounds.soc}</span>
              <span>TRAVEL {evidence.adversarialBounds.travel}</span>
            </div>
          </div>
          <div className={`voi-evidence ${stage === "clarify" ? "pending" : "resolved"}`}>
            <span>{stage === "clarify" ? "OPERATOR INPUT REQUIRED" : "DECISION FACT VERIFIED"}</span>
            <div>
              <b>Question #{decision.topQuestion.rank}: {decision.topQuestion.facility} {decision.topQuestion.fieldLabel}</b>
              <small>{decision.topQuestion.avoidableViolationScenarios} avoidable failures · {decision.topQuestion.assignmentChanges} missions can change · {decision.counterfactualPlanScenarioEvaluations.toLocaleString()} exact counterfactual evaluations</small>
            </div>
            <em>{stage === "clarify" ? "guessing blocked" : selectedDecisionOption.label}</em>
          </div>
          {resilience && (
            <div className={`resilience-evidence ${isHardened ? "certified" : "exposed"}`} aria-label="N-1 resilience evidence">
              <div className="resilience-heading">
                <span>{isHardened ? "N-1 RECOVERY CERTIFICATE" : "HIDDEN SINGLE-POINT SCAN"}</span>
                <small>{resilience.actionCount} preparedness actions × {resilience.contingencyCount} single failures × 256 stress scenarios</small>
              </div>
              <div className="resilience-score baseline-score">
                <b>{resilience.baseline.protectedContingencies}/{resilience.contingencyCount}</b>
                <small>without preparation</small>
              </div>
              <div className="resilience-arrow"><span>→</span><small>min intervention</small></div>
              <div className="resilience-score prepared-score">
                <b>{resilience.selectedAction.protectedContingencies}/{resilience.contingencyCount}</b>
                <small>{resilience.selectedAction.nMinusOneCertified ? "critical service certified" : "best attainable result"}</small>
              </div>
              <div className="resilience-action">
                <b>{resilience.selectedAction.label}</b>
                <small>{resilience.selectedAction.detail}</small>
                <em>{resilience.totalPlanScenarioEvaluations.toLocaleString()} plan-scenario evaluations · {resilience.selectedAction.actionCostLabel}</em>
              </div>
              {!isHardened && (
                <div className="resilience-gaps">
                  {resilience.weakestBaselineCases.map((contingency) => <span key={contingency.id}>{contingency.label}</span>)}
                </div>
              )}
            </div>
          )}
          <div className="benchmark-grid">
            <article className="benchmark-card baseline">
              <div><p>Greedy baseline</p><span>FRAGILE</span></div>
              <strong>{evidence.baseline.successRate.toFixed(1)}%</strong>
              <small>scenario success</small>
              <dl>
                <div><dt>Violation scenarios</dt><dd>{evidence.baseline.violationScenarios} / {evidence.scenarioCount}</dd></div>
                <div><dt>Worst service gap</dt><dd>{evidence.baseline.worstUnservedKwh.toFixed(1)} kWh</dd></div>
                <div><dt>Worst reserve margin</dt><dd>{evidence.baseline.worstReserveMargin.toFixed(1)} pts</dd></div>
              </dl>
            </article>
            <div className="benchmark-arrow" aria-hidden="true"><span>→</span><small>exact search</small></div>
            <article className="benchmark-card optimized">
              <div><p>Lifeline robust plan</p><span>CERTIFIED</span></div>
              <strong>{evidence.optimized.successRate.toFixed(1)}%</strong>
              <small>scenario success</small>
              <dl>
                <div><dt>Violation scenarios</dt><dd>{evidence.optimized.violationScenarios} / {evidence.scenarioCount}</dd></div>
                <div><dt>Worst service gap</dt><dd>{evidence.optimized.worstUnservedKwh.toFixed(1)} kWh</dd></div>
                <div><dt>Worst reserve margin</dt><dd>+{evidence.optimized.worstReserveMargin.toFixed(1)} pts</dd></div>
              </dl>
            </article>
            <article className="algorithm-card">
              <p className="panel-kicker">ALGORITHM</p>
              <h3>Ask, optimize, then survive</h3>
              <ol>
                <li><span>1</span>Rank facts by avoidable failure</li>
                <li><span>2</span>Re-optimize every possible answer</li>
                <li><span>3</span>Protect priority-weighted service</li>
                <li><span>4</span>Eliminate N-1 single points</li>
              </ol>
              <small>Value of information · exact allocation · low-discrepancy stress · contingency search</small>
            </article>
          </div>
          {isRerouted && (
            <div className="event-evidence">
              <span className={`mode-badge ${eventMode}`}>{eventMode === "gpt-5.6" ? "GPT-5.6 EVENT" : "EVENT FALLBACK"}</span>
              <div><b>Narrative disruption became machine state</b><small>{eventSummary}</small></div>
              <em>east-bridge = blocked → global re-optimization</em>
            </div>
          )}
        </section>
      )}

      {isVerified && (
        <section className="panel operations-panel" aria-label="Operational trust and deployment readiness">
          <div className="operations-heading">
            <div>
              <p className="panel-kicker">OPERATIONAL TRUST LAYER</p>
              <h2>Fail closed. Separate authority. Export the evidence.</h2>
              <p>A safe calculation is not permission to operate. Mission authorization and field qualification are evaluated independently.</p>
            </div>
            <div className="readiness-badges">
              <span className={readiness.simulationReady ? "simulation-ready" : "authorization-blocked"}>
                {readiness.simulationReady ? "SIMULATION READY" : "AUTHORIZATION BLOCKED"}
              </span>
              <span className="field-blocked">FIELD DEPLOYMENT BLOCKED</span>
            </div>
          </div>

          <div className="trust-metrics">
            <article>
              <small>Mission authorization</small>
              <b>{readiness.missionPassed}/{readiness.missionTotal}</b>
              <span>machine + human gates</span>
            </article>
            <article>
              <small>Audit integrity</small>
              <b>{auditEvents.length}</b>
              <span>events chained on export</span>
            </article>
            <article className="field-gap">
              <small>Field qualification</small>
              <b>{readiness.fieldPassed}/{readiness.fieldTotal}</b>
              <span>external evidence attached</span>
            </article>
          </div>

          <div className="operations-grid">
            <article className="gate-card">
              <div className="gate-card-heading"><h3>Mission authorization gates</h3><span>{readiness.missionPassed}/{readiness.missionTotal}</span></div>
              <ul>
                {readiness.missionGates.map((gate) => (
                  <li className={gate.state} key={gate.id}>
                    <i>{gate.state === "pass" ? "✓" : gate.state === "blocked" ? "×" : "•"}</i>
                    <div><b>{gate.label}</b><small>{gate.detail}</small></div>
                    <em>{gate.owner}</em>
                  </li>
                ))}
              </ul>
            </article>

            <article className="gate-card field-gates">
              <div className="gate-card-heading"><h3>Field deployment qualification</h3><span>FAIL CLOSED</span></div>
              <ul>
                {readiness.fieldGates.map((gate) => (
                  <li className={gate.state} key={gate.id}>
                    <i>{gate.state === "pass" ? "✓" : "×"}</i>
                    <div><b>{gate.label}</b><small>{gate.detail}</small></div>
                    <em>{gate.owner}</em>
                  </li>
                ))}
              </ul>
            </article>

            <article className="evidence-card">
              <p className="panel-kicker">PORTABLE SAFETY CASE</p>
              <h3>Tamper-evident evidence package</h3>
              <p>Exports source mode, verified fact, assignments, uncertainty result, N-1 action, approvals, readiness gates, and a SHA-256 audit chain.</p>
              <div className="approval-chain">
                <span className={isApproved ? "done" : "pending"}><i>1</i><b>Incident Lead</b><small>{isApproved ? LEAD_APPROVAL.actorId : "approval pending"}</small></span>
                <em>→</em>
                <span className={isAuthorized ? "done" : "pending"}><i>2</i><b>Safety Officer</b><small>{isAuthorized ? SAFETY_APPROVAL.actorId : "independent co-sign pending"}</small></span>
              </div>
              <button type="button" onClick={() => void downloadEvidencePackage()} disabled={!readiness.simulationReady || evidenceStatus === "building"}>
                {evidenceStatus === "building" ? "Building + verifying package…" : "Export verified simulation evidence (.json)"}
              </button>
              <div className={`integrity-result ${evidenceStatus}`}>
                <span>{evidenceStatus === "verified" ? "✓" : evidenceStatus === "error" ? "×" : "#"}</span>
                <div>
                  <b>{evidenceStatus === "verified" ? "Package verified before download" : evidenceStatus === "error" ? "Package verification failed" : "SHA-256 generated only after dual control"}</b>
                  <small title={evidenceHash}>{evidenceHash ? `${evidenceHash.slice(0, 24)}…` : "No evidence hash issued yet"}</small>
                </div>
              </div>
              <small className="evidence-boundary">Integrity hash detects changes; it is not a KMS-backed digital signature. Production signing and append-only retention remain required.</small>
            </article>
          </div>
        </section>
      )}

      <section className="panel mission-log" aria-label="Mission event log">
        <div className="log-heading">
          <div><p className="panel-kicker">AUDITABLE MISSION LOOP</p><h2>From report to resilient response</h2></div>
          <span>{isAuthorized ? "DUAL-CONTROL SIMULATION ONLY" : "NO DISPATCH YET"}</span>
        </div>
        <ol>
          <li className="done"><i>01</i><div><b>Reports received</b><small>3 fictional facilities · 02:14</small></div></li>
          <li className={completed >= stageIndex.clarify ? "done" : completed === stageIndex.candidate ? "current risk" : ""}><i>02</i><div><b>Unsafe shortcut blocked</b><small>{completed >= stageIndex.candidate ? `${aiMode === "gpt-5.6" ? "GPT-5.6" : "Demo fallback"} · E-12 rejected` : "Awaiting analysis"}</small></div></li>
          <li className={completed >= stageIndex.verified ? "done" : completed === stageIndex.clarify ? "current" : ""}><i>03</i><div><b>Critical fact resolved</b><small>{completed >= stageIndex.verified ? selectedDecisionOption.label : completed === stageIndex.clarify ? `${decision.questionCount} questions ranked` : "Not started"}</small></div></li>
          <li className={completed >= stageIndex.verified ? "done" : ""}><i>04</i><div><b>Robust optimum certified</b><small>{completed >= stageIndex.verified ? `${evidence?.scenarioEvaluations.toLocaleString()} plan-scenarios checked` : "Waiting for verified fact"}</small></div></li>
          <li className={completed >= stageIndex.hardened ? "done" : completed === stageIndex.verified ? "current risk" : ""}><i>05</i><div><b>Single points eliminated</b><small>{completed >= stageIndex.hardened ? `${resilience?.selectedAction.protectedContingencies}/${resilience?.contingencyCount} N-1 cases protected` : completed === stageIndex.verified ? `${resilience?.weakestBaselineCases.length ?? 0} gaps found` : "Not started"}</small></div></li>
          <li className={completed >= stageIndex.approved ? "done" : completed === stageIndex.hardened ? "current" : ""}><i>06</i><div><b>Lead approval</b><small>{completed >= stageIndex.approved ? LEAD_APPROVAL.actorId : "Required"}</small></div></li>
          <li className={completed >= stageIndex.authorized ? "done" : completed === stageIndex.approved ? "current" : ""}><i>07</i><div><b>Independent co-sign</b><small>{completed >= stageIndex.authorized ? SAFETY_APPROVAL.actorId : "Distinct Safety Officer required"}</small></div></li>
          <li className={completed >= stageIndex.rerouted ? "done" : completed === stageIndex.authorized ? "current" : ""}><i>08</i><div><b>Disruption re-optimized</b><small>{completed >= stageIndex.rerouted ? "All remaining missions rebuilt" : "Ready for closure drill"}</small></div></li>
        </ol>
      </section>

      <footer className="site-footer">
        <p>Fictional training data · No real vehicles or facilities · No autonomous dispatch</p>
        <p>OpenAI Build Week 2026 · Work &amp; Productivity</p>
      </footer>
    </main>
  );
}
