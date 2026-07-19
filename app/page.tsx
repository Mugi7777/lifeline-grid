const vehicles = [
  { id: "E-07", x: 24, y: 62, soc: 78, status: "available" },
  { id: "E-12", x: 42, y: 30, soc: 46, status: "risk" },
  { id: "E-21", x: 66, y: 55, soc: 82, status: "assigned" },
  { id: "E-32", x: 80, y: 28, soc: 64, status: "available" },
];

const sites = [
  { label: "Riverside Clinic", x: 17, y: 22, tone: "critical" },
  { label: "North Shelter", x: 58, y: 16, tone: "high" },
  { label: "East Water Station", x: 86, y: 68, tone: "critical" },
];

export default function Home() {
  return (
    <main className="command-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
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
        </div>
        <button className="primary-action" type="button">
          Analyze reports with GPT-5.6
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="metric-grid" aria-label="Mission metrics">
        <article className="metric-card">
          <p>Critical load coverage</p>
          <div><strong>4.1</strong><span>hours</span></div>
          <small className="metric-warning">Below 8 h target</small>
        </article>
        <article className="metric-card">
          <p>Unserved critical energy</p>
          <div><strong>18.2</strong><span>kWh</span></div>
          <small className="metric-warning">3 sites requesting power</small>
        </article>
        <article className="metric-card">
          <p>Candidate violations</p>
          <div><strong>2</strong><span>blocked</span></div>
          <small className="metric-danger">Safety proof required</small>
        </article>
        <article className="metric-card accent-card">
          <p>Fleet mobility reserve</p>
          <div><strong>100</strong><span>%</span></div>
          <small>Hard constraint enabled</small>
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
            </div>
          </div>

          <div className="mission-map" aria-label="Synthetic mission map">
            <div className="map-grid" />
            <svg className="route-layer" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
              <path className="route-line route-risk" d="M 42 30 C 34 25, 27 22, 17 22" />
              <path className="route-line route-safe" d="M 66 55 C 74 60, 78 66, 86 68" />
              <path className="road-line" d="M 2 44 C 28 38, 52 48, 98 34" />
              <path className="road-line" d="M 50 2 C 46 24, 58 55, 54 78" />
            </svg>

            {sites.map((site) => (
              <div
                className={`site-node ${site.tone}`}
                key={site.label}
                style={{ left: `${site.x}%`, top: `${site.y}%` }}
              >
                <span className="site-pulse" />
                <b>{site.label}</b>
              </div>
            ))}

            {vehicles.map((vehicle) => (
              <div
                className={`vehicle-node ${vehicle.status}`}
                key={vehicle.id}
                style={{ left: `${vehicle.x}%`, top: `${vehicle.y}%` }}
              >
                <span className="vehicle-icon" aria-hidden="true">◆</span>
                <div><b>{vehicle.id}</b><small>{vehicle.soc}% SoC</small></div>
              </div>
            ))}

            <div className="map-note risk-note">
              <span>!</span>
              <div><b>E-12 cannot complete Clinic mission</b><small>Return reserve would fall below 35%</small></div>
            </div>
          </div>
        </article>

        <aside className="right-rail">
          <article className="panel incident-panel">
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">GPT-5.6 INTAKE</p>
                <h2>Incident reports</h2>
              </div>
              <span className="count-badge">3</span>
            </div>
            <div className="incident-list">
              <div className="incident-item critical">
                <div className="incident-meta"><b>Riverside Clinic</b><span>02:11</span></div>
                <p>Medication refrigeration offline. 0.9 kW for 8 hours. Power needed within 45 minutes.</p>
                <div className="contract-row"><span>CRITICAL</span><span>V2L</span><span>CONF. 96%</span></div>
              </div>
              <div className="incident-item high">
                <div className="incident-meta"><b>North Shelter</b><span>02:12</span></div>
                <p>Lighting and communications need 2.4 kW for the next 6 hours.</p>
                <div className="contract-row"><span>HIGH</span><span>V2L</span><span>CONF. 93%</span></div>
              </div>
              <div className="incident-item critical">
                <div className="incident-meta"><b>East Water Station</b><span>02:14</span></div>
                <p>Control and pump load requires 4.2 kW for 4 hours. V2H interface ready.</p>
                <div className="contract-row"><span>CRITICAL</span><span>V2H</span><span>CONF. 98%</span></div>
              </div>
            </div>
          </article>

          <article className="panel proof-panel">
            <div className="panel-heading compact">
              <div>
                <p className="panel-kicker">DETERMINISTIC GATE</p>
                <h2>Safety proof</h2>
              </div>
              <span className="proof-status blocked">BLOCKED</span>
            </div>
            <ul className="proof-list">
              <li className="pass"><span>✓</span><div><b>Connector compatibility</b><small>All proposed links supported</small></div></li>
              <li className="fail"><span>×</span><div><b>Mobility reserve</b><small>E-12 returns at 7%, minimum 35%</small></div></li>
              <li className="fail"><span>×</span><div><b>Required duration</b><small>1.3 h available, 8 h required</small></div></li>
              <li className="pending"><span>•</span><div><b>Human approval</b><small>Required before simulated dispatch</small></div></li>
            </ul>
          </article>
        </aside>
      </section>

      <footer className="site-footer">
        <p>Fictional data · No real vehicles or facilities · Human approval required</p>
        <p>OpenAI Build Week 2026</p>
      </footer>
    </main>
  );
}
