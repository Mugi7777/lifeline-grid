"use client";

import { useMemo, useState } from "react";
import {
  REGIONAL_MODEL,
  analyzeRegionalAccess,
  type RoadCriticality,
} from "@/lib/regional";

type AiMode = "ready" | "gpt-5.6" | "demo-fallback";

interface RegionalAccessProps {
  onSwitchToEmergency: () => void;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function roadTone(item: RoadCriticality) {
  if (item.rank === 1) return "critical";
  if (item.road.conditionGrade >= 4) return "high";
  if (item.road.conditionGrade === 3) return "watch";
  return "stable";
}

export default function RegionalAccess({ onSwitchToEmergency }: RegionalAccessProps) {
  const [closedSegmentId, setClosedSegmentId] = useState<string | null>(null);
  const [budgetM, setBudgetM] = useState(120);
  const [aiMode, setAiMode] = useState<AiMode>("ready");
  const [working, setWorking] = useState(false);
  const [eventSummary, setEventSummary] = useState("Inspection note has not been interpreted yet.");
  const analysis = useMemo(() => analyzeRegionalAccess(closedSegmentId, budgetM), [budgetM, closedSegmentId]);
  const criticalityById = useMemo(
    () => new Map(analysis.roadCriticality.map((item) => [item.road.id, item])),
    [analysis.roadCriticality],
  );
  const usedRoads = new Set(analysis.activePlan.routes.flatMap((route) => route.usedRoadSegmentIds));
  const repairedRoads = new Set(analysis.repairPortfolio.selectedRoads.map((item) => item.road.id));
  const activeClosure = closedSegmentId ? criticalityById.get(closedSegmentId) : null;

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

      <section className="regional-metrics" aria-label="Regional access metrics" aria-live="polite">
        <article><small>Household access</small><b>{analysis.activePlan.metrics.serviceCoveragePercent}%</b><span>{analysis.activePlan.metrics.householdsCovered}/418 covered on time</span></article>
        <article><small>Vulnerable coverage</small><b>{analysis.activePlan.metrics.vulnerableCoveragePercent}%</b><span>{analysis.activePlan.metrics.vulnerableResidentsCovered}/152 residents protected</span></article>
        <article><small>Critical stress proof</small><b>{analysis.stress.criticalServiceSuccessRate}%</b><span>{analysis.stress.scenarioCount} bounded scenarios</span></article>
        <article><small>Pooling distance gain</small><b>{analysis.pooledDistanceSavingPercent}%</b><span>vs single-stop dispatch</span></article>
        <article className="risk-metric"><small>Repair risk reduction</small><b>{analysis.repairPortfolio.riskReductionPercent}%</b><span>within ¥{budgetM}m budget</span></article>
      </section>

      <section className="regional-workspace">
        <article className="panel regional-map-panel">
          <div className="regional-panel-heading">
            <div><p className="panel-kicker">SERVICE-WEIGHTED ROAD GRAPH</p><h2>{analysis.model.district}</h2></div>
            <div className="regional-map-legend"><span><i className="risk" /> Access risk</span><span><i className="used" /> Active delivery</span><span><i className="repair" /> Repair portfolio</span></div>
          </div>
          <div className="regional-map" aria-label="Synthetic rural road and delivery network">
            <div className="map-grid" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {analysis.model.roads.map((road) => {
                const from = analysis.model.nodes.find((node) => node.id === road.from)!;
                const to = analysis.model.nodes.find((node) => node.id === road.to)!;
                const item = criticalityById.get(road.id)!;
                const classes = [
                  "regional-road",
                  roadTone(item),
                  usedRoads.has(road.id) ? "used" : "",
                  repairedRoads.has(road.id) ? "portfolio" : "",
                  closedSegmentId === road.id ? "closed" : "",
                ].filter(Boolean).join(" ");
                return <line className={classes} x1={from.x} y1={from.y} x2={to.x} y2={to.y} key={road.id} />;
              })}
            </svg>
            {analysis.model.nodes.map((node) => {
              const demand = analysis.model.demands.find((item) => item.nodeId === node.id);
              const failed = demand && (analysis.activePlan.metrics.unservedDemandIds.includes(demand.id) || analysis.activePlan.metrics.lateDemandIds.includes(demand.id));
              return (
                <div className={`regional-node ${node.kind} ${failed ? "access-failed" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} key={node.id}>
                  <i>{node.kind === "hub" ? "H" : node.kind === "clinic" ? "+" : "•"}</i>
                  <span><b>{node.label}</b><small>{demand ? `${demand.households} hh · ${demand.vulnerableResidents} priority` : "shared depot"}</small></span>
                </div>
              );
            })}
            <div className={`regional-map-callout ${activeClosure ? "failure" : "baseline"}`}>
              <span>{activeClosure ? "!" : "✓"}</span>
              <div>
                <b>{activeClosure ? `${activeClosure.road.label} removed from graph` : "All modeled communities remain connected"}</b>
                <small>{activeClosure ? `${activeClosure.vulnerableResidentsAtRisk} vulnerable residents · ${activeClosure.householdsAtRisk} households lose on-time access` : `${analysis.activePlan.candidateAssignments.toLocaleString()} assignments searched · exact optimum certified`}</small>
              </div>
            </div>
          </div>
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
