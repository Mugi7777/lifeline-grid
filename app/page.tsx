"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_NEEDS,
  VEHICLES,
  buildUnsafeCandidate,
  buildVerifiedPlan,
  type Assignment,
  type DispatchPlan,
  type PowerNeed,
} from "@/lib/planner";

type Stage = "intake" | "candidate" | "verified" | "approved" | "rerouted";
type AiMode = "ready" | "gpt-5.6" | "demo-fallback";

const stageIndex: Record<Stage, number> = {
  intake: 0,
  candidate: 1,
  verified: 2,
  approved: 3,
  rerouted: 4,
};

const actionLabels: Record<Stage, string> = {
  intake: "Analyze reports with GPT-5.6",
  candidate: "Run deterministic safety gate",
  verified: "Approve simulated dispatch",
  approved: "Simulate bridge closure",
  rerouted: "Reset training scenario",
};

const actionSubtitles: Record<Stage, string> = {
  intake: "Narrative → power contracts",
  candidate: "Reject physically unsafe plans",
  verified: "Human decision required",
  approved: "Test live disruption response",
  rerouted: "Replay the full mission loop",
};

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

function routePath(assignment: Assignment) {
  const { vehicle, need } = assignment;
  const controlX = (vehicle.x + need.x) / 2;
  const controlY = Math.min(vehicle.y, need.y) - 8;
  return `M ${vehicle.x} ${vehicle.y} Q ${controlX} ${controlY} ${need.x} ${need.y}`;
}

function proofRows(stage: Stage, plan: DispatchPlan) {
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

  if (stage === "rerouted") {
    const water = plan.assignments.find((assignment) => assignment.need.id === "water")!;
    return [
      { state: "fail", label: "Original route", detail: "East Bridge closure invalidated E-21" },
      { state: "pass", label: "Alternate route", detail: `${water.vehicle.id} via ${water.route.routeLabel} · ${water.route.oneWayMinutes} min` },
      { state: "pass", label: "Mobility reserve", detail: `${water.postMissionSoc}% after mission · 35% minimum` },
      { state: "pass", label: "Human authority", detail: "Prior approval scope retained for simulation" },
    ];
  }

  return [
    { state: "pass", label: "Connector + output", detail: "All 3 assignments match site interfaces" },
    { state: "pass", label: "Energy + duration", detail: "12.0 critical site-hours protected" },
    { state: "pass", label: "Mobility reserve", detail: "Every vehicle remains at or above 35%" },
    stage === "approved"
      ? { state: "pass", label: "Human approval", detail: "Incident Lead · simulated at 02:19" }
      : { state: "pending", label: "Human approval", detail: "Required before simulated dispatch" },
  ];
}

function statusForVehicle(vehicleId: string, stage: Stage, plan: DispatchPlan) {
  const assignment = plan.assignments.find((item) => item.vehicle.id === vehicleId);
  if (!assignment || stage === "intake") return "idle";
  if (!assignment.safe) return "risk";
  if (stage === "approved" || stage === "rerouted") return "dispatched";
  return "assigned";
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("intake");
  const [needs, setNeeds] = useState<PowerNeed[]>(DEFAULT_NEEDS);
  const [aiMode, setAiMode] = useState<AiMode>("ready");
  const [working, setWorking] = useState(false);

  const plan = useMemo(() => {
    if (stage === "intake" || stage === "candidate") return buildUnsafeCandidate(needs);
    return buildVerifiedPlan(stage === "rerouted" ? ["east-bridge"] : [], needs);
  }, [needs, stage]);

  const rows = proofRows(stage, plan);
  const completed = stageIndex[stage];
  const isStructured = completed >= stageIndex.candidate;
  const isApproved = completed >= stageIndex.approved;
  const isRerouted = stage === "rerouted";

  const metrics = stage === "intake"
    ? { protection: "0.0", unserved: "24.0", violations: "—", reserve: "100" }
    : {
        protection: plan.criticalSiteHours.toFixed(1),
        unserved: plan.unservedCriticalKwh.toFixed(1),
        violations: String(plan.violationCount),
        reserve: "100",
      };

  async function analyzeReports() {
    setWorking(true);
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
    await wait(stage === "candidate" ? 520 : 360);
    if (stage === "candidate") setStage("verified");
    if (stage === "verified") setStage("approved");
    if (stage === "approved") setStage("rerouted");
    if (stage === "rerouted") {
      setStage("intake");
      setAiMode("ready");
      setNeeds(DEFAULT_NEEDS);
    }
    setWorking(false);
  }

  const proofTone = stage === "candidate" ? "blocked" : stage === "intake" ? "waiting" : "verified";
  const proofLabel = stage === "candidate" ? "BLOCKED" : stage === "intake" ? "WAITING" : stage === "rerouted" ? "RE-PLANNED" : stage === "approved" ? "APPROVED" : "VERIFIED";
  const modeLabel = aiMode === "gpt-5.6" ? "GPT-5.6 LIVE" : aiMode === "demo-fallback" ? "DEMO FALLBACK" : "UNSTRUCTURED";

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
              <small>{working ? "Every hard constraint remains enforced" : actionSubtitles[stage]}</small>
            </span>
            <span className="action-arrow" aria-hidden="true">→</span>
          </button>
          {stage !== "intake" && (
            <button className="reset-action" type="button" onClick={() => { setStage("intake"); setAiMode("ready"); setNeeds(DEFAULT_NEEDS); }}>
              Reset
            </button>
          )}
        </div>
      </section>

      <section className="metric-grid" aria-label="Mission metrics" aria-live="polite">
        <article className={`metric-card ${completed >= 2 ? "positive" : ""}`}>
          <p>Critical protection</p>
          <div><strong>{metrics.protection}</strong><span>site-h</span></div>
          <small className={completed >= 2 ? "metric-ok" : "metric-warning"}>{completed >= 2 ? "Full 12 h target protected" : "12 h target across critical sites"}</small>
        </article>
        <article className={`metric-card ${completed >= 2 ? "positive" : ""}`}>
          <p>Unserved critical energy</p>
          <div><strong>{metrics.unserved}</strong><span>kWh</span></div>
          <small className={completed >= 2 ? "metric-ok" : "metric-warning"}>{completed >= 2 ? "All critical demand covered" : "Power gap remains"}</small>
        </article>
        <article className={`metric-card ${stage === "candidate" ? "danger" : completed >= 2 ? "positive" : ""}`}>
          <p>Safety violations</p>
          <div><strong>{metrics.violations}</strong><span>{stage === "candidate" ? "blocked" : "hard gates"}</span></div>
          <small className={stage === "candidate" ? "metric-danger" : completed >= 2 ? "metric-ok" : ""}>{stage === "candidate" ? "Unsafe dispatch prevented" : completed >= 2 ? "Deterministic proof passed" : "Awaiting candidate plan"}</small>
        </article>
        <article className="metric-card accent-card">
          <p>Fleet mobility reserve</p>
          <div><strong>{metrics.reserve}</strong><span>% protected</span></div>
          <small>35% hard floor enforced</small>
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

            {needs.map((need) => (
              <div className={`site-node ${need.priority}`} key={need.id} style={{ left: `${need.x}%`, top: `${need.y}%` }}>
                <span className="site-pulse" />
                <div><b>{need.facility}</b><small>{need.powerKw.toFixed(1)} kW · {need.durationHours} h</small></div>
              </div>
            ))}

            {VEHICLES.map((vehicle) => {
              const status = statusForVehicle(vehicle.id, stage, plan);
              return (
                <div className={`vehicle-node ${status}`} key={vehicle.id} style={{ left: `${vehicle.x}%`, top: `${vehicle.y}%` }}>
                  <span className="vehicle-icon" aria-hidden="true">◆</span>
                  <div><b>{vehicle.id}</b><small>{vehicle.soc}% SoC</small></div>
                </div>
              );
            })}

            {isRerouted && <div className="bridge-closure"><span>×</span><b>BRIDGE CLOSED</b></div>}

            <div className={`map-note ${stage === "candidate" ? "risk-note" : completed >= 2 ? "safe-note" : "waiting-note"}`}>
              <span>{stage === "candidate" ? "!" : completed >= 2 ? "✓" : "···"}</span>
              <div>
                <b>{stage === "intake" && "Three reports are waiting for structured intake"}</b>
                <b>{stage === "candidate" && "E-12 cannot complete the Clinic mission"}</b>
                <b>{stage === "verified" && "Safe plan found without relaxing constraints"}</b>
                <b>{stage === "approved" && "Simulated dispatch approved by a human"}</b>
                <b>{stage === "rerouted" && "Closure absorbed: E-44 replaces E-21"}</b>
                <small>{stage === "candidate" ? "Duration and mobility reserve both fail" : stage === "rerouted" ? "Ridge Bypass restores full critical coverage" : stage === "intake" ? "No dispatch decision has been made" : "All vehicles retain the 35% mobility floor"}</small>
              </div>
            </div>
          </div>

          <div className="assignment-strip" aria-label="Dispatch assignments">
            {stage === "intake" ? (
              <div className="pipeline-preview">
                <span><i>1</i><b>Understand</b><small>GPT-5.6 structures reports</small></span>
                <em>→</em>
                <span><i>2</i><b>Prove</b><small>Hard constraints reject risk</small></span>
                <em>→</em>
                <span><i>3</i><b>Act</b><small>Human approves simulation</small></span>
              </div>
            ) : plan.assignments.map((assignment) => (
              <div className={`assignment-card ${assignment.safe ? "safe" : "blocked"}`} key={assignment.need.id}>
                <div className="assignment-route"><b>{assignment.vehicle.id}</b><span>→</span><b>{assignment.need.facility}</b></div>
                <div className="assignment-detail">
                  <span>{assignment.route.oneWayMinutes} min</span>
                  <span>{assignment.coverageHours.toFixed(1)} h cover</span>
                  <span>{assignment.postMissionSoc.toFixed(1)}% after</span>
                </div>
                <small>{assignment.safe ? isRerouted && assignment.need.id === "water" ? "RE-ROUTED" : "VERIFIED" : "BLOCKED"}</small>
              </div>
            ))}
          </div>
        </article>

        <aside className="right-rail">
          <article className="panel incident-panel">
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">GPT-5.6 INTAKE</p>
                <h2>Incident reports</h2>
              </div>
              <span className={`mode-badge ${aiMode}`}>{modeLabel}</span>
            </div>
            <div className="incident-list">
              {needs.map((need, index) => (
                <div className={`incident-item ${need.priority}`} key={need.id}>
                  <div className="incident-meta"><b>{need.facility}</b><span>02:{11 + index}</span></div>
                  <p>{isStructured ? need.summary : need.report}</p>
                  {isStructured && (
                    <div className="contract-row">
                      <span>{need.priority.toUpperCase()}</span>
                      <span>{need.powerKw.toFixed(1)} kW × {need.durationHours} h</span>
                      <span>{need.connector}</span>
                      <span>CONF. {Math.round(need.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isStructured && <p className="source-proof">Source-linked contracts · Assumptions remain explicit</p>}
          </article>

          <article className="panel proof-panel">
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">DETERMINISTIC GATE</p>
                <h2>Safety proof</h2>
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
            <div className="decision-boundary">
              <span><b>AI</b> extracts</span><i>→</i><span><b>Kernel</b> decides</span><i>→</i><span><b>Human</b> authorizes</span>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel mission-log" aria-label="Mission event log">
        <div className="log-heading">
          <div><p className="panel-kicker">AUDITABLE MISSION LOOP</p><h2>From report to resilient response</h2></div>
          <span>{isApproved ? "SIMULATED DISPATCH ONLY" : "NO DISPATCH YET"}</span>
        </div>
        <ol>
          <li className="done"><i>01</i><div><b>Reports received</b><small>3 fictional facilities · 02:14</small></div></li>
          <li className={completed >= 1 ? "done" : "current"}><i>02</i><div><b>Needs structured</b><small>{completed >= 1 ? `${aiMode === "gpt-5.6" ? "GPT-5.6" : "Demo fallback"} · source linked` : "Awaiting analysis"}</small></div></li>
          <li className={completed >= 2 ? "done" : completed === 1 ? "current risk" : ""}><i>03</i><div><b>Plan safety-gated</b><small>{completed === 1 ? "E-12 candidate blocked" : completed >= 2 ? "0 hard-constraint violations" : "Not started"}</small></div></li>
          <li className={completed >= 3 ? "done" : completed === 2 ? "current" : ""}><i>04</i><div><b>Human approval</b><small>{completed >= 3 ? "Recorded for simulation" : "Required"}</small></div></li>
          <li className={completed >= 4 ? "done" : completed === 3 ? "current" : ""}><i>05</i><div><b>Disruption re-planned</b><small>{completed >= 4 ? "Coverage restored via E-44" : "Ready for closure drill"}</small></div></li>
        </ol>
      </section>

      <footer className="site-footer">
        <p>Fictional training data · No real vehicles or facilities · No autonomous dispatch</p>
        <p>OpenAI Build Week 2026 · Work &amp; Productivity</p>
      </footer>
    </main>
  );
}
