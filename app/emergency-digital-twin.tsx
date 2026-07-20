"use client";

import type { EmergencyTwinSnapshot, TwinLayer, TwinScenario } from "@/lib/emergency-twin";

interface EmergencyDigitalTwinProps {
  snapshot: EmergencyTwinSnapshot;
  layer: TwinLayer;
  minute: number;
  playing: boolean;
  onLayerChange: (layer: TwinLayer) => void;
  onMinuteChange: (minute: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onScenarioChange: (scenario: TwinScenario) => void;
  onExportEvidence: () => void;
  onAskSol: () => void;
}

const SCENARIOS: Array<{ id: TwinScenario; label: string; signal: string }> = [
  { id: "nominal", label: "Nominal", signal: "All feeds" },
  { id: "pump_drift", label: "Pump drift", signal: "+2.3 kW" },
  { id: "bridge_conflict", label: "Bridge conflict", signal: "2 reports" },
  { id: "telemetry_loss", label: "Telemetry loss", signal: "2 stale" },
];

function layerLabel(layer: TwinLayer) {
  if (layer === "observed") return "OBSERVED";
  if (layer === "forecast") return "FORECAST +6H";
  return "ESTIMATED";
}

function assetValue(snapshot: EmergencyTwinSnapshot, assetId: string, layer: TwinLayer) {
  const asset = snapshot.assets.find((item) => item.id === assetId)!;
  if (layer === "observed") return asset.observedSoc ?? asset.lastObservedSoc;
  if (layer === "forecast") return asset.forecastSoc;
  return asset.estimatedSoc;
}

function facilityValue(snapshot: EmergencyTwinSnapshot, facilityId: string, layer: TwinLayer) {
  const facility = snapshot.facilities.find((item) => item.id === facilityId)!;
  if (layer === "observed") return facility.observedLoadKw ?? facility.lastObservedLoadKw;
  if (layer === "forecast") return facility.forecastLoadKw;
  return facility.estimatedLoadKw;
}

export default function EmergencyDigitalTwin({
  snapshot,
  layer,
  minute,
  playing,
  onLayerChange,
  onMinuteChange,
  onPlayingChange,
  onScenarioChange,
  onExportEvidence,
  onAskSol,
}: EmergencyDigitalTwinProps) {
  const assignedAssets = snapshot.assets.filter((asset) => asset.mission);
  const staleCount = snapshot.assets.filter((asset) => asset.freshness === "stale").length
    + snapshot.facilities.filter((facility) => facility.freshness === "stale").length;
  return (
    <section className={`emergency-twin ${snapshot.trustState}`} id="digital-twin">
      <header className="emergency-twin-heading">
        <div>
          <span>OPERATIONAL DIGITAL TWIN</span>
          <h2>Replay the grid. Inject a failure. See six hours ahead.</h2>
          <p>Event-sourced synthetic telemetry is filtered into an estimated state and projected against the verified plan. No twin state can dispatch or actuate infrastructure.</p>
        </div>
        <div className={`emergency-twin-sync ${snapshot.trustState}`}>
          <i />
          <span><b>{snapshot.trustState === "synchronized" ? "TWIN SYNCHRONIZED" : "TWIN DEGRADED"}</b><small>{snapshot.sourceCoveragePct}% fresh sources · T+{String(minute).padStart(2, "0")} min</small></span>
        </div>
      </header>

      <div className="emergency-twin-workspace">
        <aside className="emergency-twin-control">
          <div className="emergency-twin-control-label"><span>FAILURE INJECTION</span><small>Observed → Estimated → Forecast</small></div>
          <div className="emergency-twin-scenarios">
            {SCENARIOS.map((scenario) => (
              <button key={scenario.id} type="button" className={snapshot.scenario === scenario.id ? "active" : ""} onClick={() => onScenarioChange(scenario.id)}>
                <i>{snapshot.scenario === scenario.id ? "●" : "○"}</i><span><b>{scenario.label}</b><small>{scenario.signal}</small></span>
              </button>
            ))}
          </div>
          <div className="emergency-twin-contract">
            <span>ACTIVE CONTRACT</span>
            <b>{snapshot.scenarioLabel}</b>
            <p>{snapshot.scenario === "nominal" ? "All eight synthetic sources remain fresh and track the verified reference." : snapshot.scenario === "pump_drift" ? "Water load departs from contract. The plan is measured against a 6.5 kW forecast." : snapshot.scenario === "bridge_conflict" ? "Two road reports disagree. East Bridge remains in the plan pending human evidence." : "E-44 and the water meter stop reporting. Estimates continue with widening uncertainty."}</p>
          </div>
          {snapshot.scenario === "bridge_conflict" ? <button className="emergency-twin-sol-link" type="button" onClick={onAskSol}>Ask Sol to branch this conflict <i>↗</i></button> : null}
          <button className="emergency-twin-export" type="button" onClick={onExportEvidence}>Export twin state + SHA-256</button>
          <small className="emergency-twin-boundary">SYNTHETIC TELEMETRY ONLY · FIELD OPERATION BLOCKED</small>
        </aside>

        <div className="emergency-twin-stage">
          <div className="emergency-twin-playback">
            <button type="button" onClick={() => onPlayingChange(!playing)} aria-label={playing ? "Pause twin" : "Play twin"}><i>{playing ? "Ⅱ" : "▶"}</i><span>{playing ? "Pause twin" : "Play twin"}</span></button>
            <div>
              <header><span>T+00</span><b>T+{String(minute).padStart(2, "0")} MIN</b><span>T+90</span></header>
              <input aria-label="Digital twin time" type="range" min="0" max="90" step="5" value={minute} onChange={(event) => onMinuteChange(Number(event.target.value))} />
              <footer><span>dispatch</span><span>arrivals</span><span>forecast lock</span></footer>
            </div>
            <div className="emergency-twin-layers" aria-label="Twin state layer">
              {(["observed", "estimated", "forecast"] as TwinLayer[]).map((item) => <button key={item} type="button" className={layer === item ? "active" : ""} onClick={() => onLayerChange(item)}>{item}</button>)}
            </div>
          </div>

          <div className="emergency-twin-kpis">
            <article><small>Twin lag</small><b>{snapshot.twinLagSeconds >= 60 ? `${Math.round(snapshot.twinLagSeconds / 60)}m` : `${snapshot.twinLagSeconds}s`}</b><span>{snapshot.trustState === "synchronized" ? "within synthetic SLA" : "degraded input"}</span></article>
            <article className={staleCount ? "watch" : "good"}><small>Source coverage</small><b>{snapshot.sourceCoveragePct}%</b><span>{staleCount ? `${staleCount} stale sources` : "8 / 8 fresh"}</span></article>
            <article className={snapshot.planDivergenceScore >= 15 ? "watch" : "good"}><small>Plan divergence</small><b>{snapshot.planDivergenceScore}<em>/100</em></b><span>state vs verified plan</span></article>
            <article className={snapshot.projectedCriticalGapKwh > 0 ? "critical" : "good"}><small>Projected critical gap</small><b>{snapshot.projectedCriticalGapKwh}<em>kWh</em></b><span>deterministic 6h forecast</span></article>
          </div>

          <div className="emergency-twin-state-grid">
            <article className="emergency-twin-facilities">
              <header><span>FACILITY STATE</span><b>{layerLabel(layer)}</b></header>
              <div className="emergency-twin-table-head"><span>Facility</span><span>Contract</span><span>{layer}</span><span>Status</span></div>
              {snapshot.facilities.map((facility) => {
                const value = facilityValue(snapshot, facility.id, layer);
                const stale = layer === "observed" && facility.observedLoadKw === null;
                return <div className={facility.supplyPhase === "gap" || value > facility.contractLoadKw * 1.25 ? "risk" : ""} key={facility.id}>
                  <span><i className={facility.priority} /> <b>{facility.facility}</b><small>{facility.assignedVehicleId ?? "unassigned"}</small></span>
                  <span>{facility.contractLoadKw.toFixed(1)} kW</span>
                  <span><b>{value.toFixed(2)} kW</b><small>±{facility.uncertaintyKw}</small></span>
                  <span><em className={stale ? "stale" : facility.supplyPhase}>{stale ? `STALE ${facility.dataAgeMinutes}m` : facility.supplyPhase.toUpperCase()}</em></span>
                </div>;
              })}
            </article>

            <article className="emergency-twin-assets">
              <header><span>ASSIGNED ASSETS</span><b>KALMAN STATE</b></header>
              {assignedAssets.map((asset) => {
                const value = assetValue(snapshot, asset.id, layer);
                const stale = layer === "observed" && asset.observedSoc === null;
                return <div key={asset.id} className={value < asset.reserveSoc ? "risk" : ""}>
                  <header><span><b>{asset.id}</b><small>→ {asset.mission} · {asset.phase}</small></span><em>{stale ? `STALE ${asset.dataAgeMinutes}m` : `${layerLabel(layer)} ±${asset.uncertaintySocPoints}`}</em></header>
                  <div><i style={{ width: `${Math.max(0, value)}%` }} /><u style={{ left: `${asset.reserveSoc}%` }} /></div>
                  <footer><span>reserve {asset.reserveSoc}%</span><b>{value.toFixed(1)}% SoC</b></footer>
                </div>;
              })}
            </article>
          </div>

          <div className="emergency-twin-events">
            <header><span>EVENT-SOURCED REPLAY</span><b>{snapshot.events.length} events at T+{minute}</b></header>
            <div>
              {snapshot.events.slice(0, 5).map((event) => <article key={event.id} className={event.severity}>
                <time>T+{String(event.minute).padStart(2, "0")}</time><i /><span><b>{event.title}</b><small>{event.source} · {event.detail}</small></span><em>{event.evidenceStatus}</em>
              </article>)}
            </div>
          </div>
        </div>
      </div>
      <footer className="emergency-twin-proof">
        <span><b>EVENT-SOURCED</b><small>Replayable timeline</small></span><i>→</i><span><b>SCALAR KALMAN</b><small>Visible uncertainty</small></span><i>→</i><span><b>6H FORECAST</b><small>Plan divergence</small></span><i>→</i><span><b>HUMAN GATE</b><small>No auto-actuation</small></span>
      </footer>
    </section>
  );
}
