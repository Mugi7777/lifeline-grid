"use client";

import { useMemo, useState } from "react";
import {
  DATA_TRUST_DEMO_TIME,
  buildDataTrustEvidence,
  buildDemoDataBundle,
  evaluateOperationalData,
  type DataTrustDemoScenario,
} from "@/lib/data-trust";

const SCENARIOS: Array<{ id: DataTrustDemoScenario; label: string; short: string }> = [
  { id: "verified", label: "Verified bundle", short: "All gates pass" },
  { id: "stale_authority", label: "Stale authority", short: "Freshness breach" },
  { id: "conflicting_weather", label: "Conflicting feeds", short: "Evidence required" },
  { id: "tampered_signature", label: "Tampered signature", short: "Quarantine" },
  { id: "feed_outage", label: "Fleet outage", short: "Required feed missing" },
];

function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function sourceLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function DataTrustGateway() {
  const [scenario, setScenario] = useState<DataTrustDemoScenario>("verified");
  const [selectedFeedId, setSelectedFeedId] = useState("authority-20260719-1458");
  const [exportState, setExportState] = useState<"ready" | "working" | "done">("ready");
  const bundle = useMemo(() => buildDemoDataBundle(scenario), [scenario]);
  const evaluation = useMemo(() => evaluateOperationalData(bundle, Date.parse(DATA_TRUST_DEMO_TIME)), [bundle]);
  const selectedFeed = evaluation.feeds.find((feed) => feed.id === selectedFeedId) ?? evaluation.feeds[0];
  const activeScenario = SCENARIOS.find((item) => item.id === scenario)!;

  async function downloadEvidence() {
    setExportState("working");
    const evidence = await buildDataTrustEvidence(bundle, evaluation);
    const payload = JSON.stringify({ evidence, evaluation }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lifeline-data-trust-${scenario}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportState("done");
    window.setTimeout(() => setExportState("ready"), 1600);
  }

  return (
    <section className={`panel data-trust-panel ${evaluation.planningMode}`} aria-labelledby="data-trust-title">
      <div className="data-trust-heading">
        <div>
          <p className="panel-kicker">OPERATIONAL DATA TRUST GATEWAY × FAIL-CLOSED INGESTION</p>
          <h2 id="data-trust-title">Prove the data before optimizing the region.</h2>
          <p>Every road, map, weather and fleet feed is checked for cryptographic integrity, freshness, geographic scope, coverage and conflicts. One broken source changes the operating mode before it can change a route.</p>
        </div>
        <span className={`data-trust-mode ${evaluation.planningMode}`}><i />{evaluation.planningMode === "verified" ? "VERIFIED FOR HUMAN REVIEW" : evaluation.planningMode === "degraded" ? "DEGRADED · READ ONLY" : "QUARANTINED"}</span>
      </div>

      <div className="data-trust-scenarios" role="group" aria-label="Data trust failure scenarios">
        {SCENARIOS.map((item) => (
          <button className={scenario === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setScenario(item.id)}>
            <b>{item.label}</b><small>{item.short}</small>
          </button>
        ))}
      </div>

      <div className="data-trust-workspace">
        <article className="data-trust-score-card">
          <div className="trust-score-ring" style={{ background: `conic-gradient(${evaluation.planningMode === "verified" ? "#b8f45d" : evaluation.planningMode === "degraded" ? "#efb24e" : "#fa938b"} ${evaluation.trustScore * 3.6}deg, #2d4037 0deg)` }}>
            <span><b>{evaluation.trustScore}</b><small>TRUST SCORE</small></span>
          </div>
          <div className="data-trust-score-copy">
            <span>ACTIVE FAILURE INJECTION</span>
            <h3>{activeScenario.label}</h3>
            <p>{evaluation.nextAction}</p>
          </div>
          <div className="data-trust-facts">
            <span><b>{evaluation.trustedFeeds}/{evaluation.totalFeeds}</b><small>trusted feeds</small></span>
            <span><b>{evaluation.recordsEvaluated.toLocaleString()}</b><small>records checked</small></span>
            <span><b>{evaluation.blockers.length}</b><small>blocking findings</small></span>
          </div>
        </article>

        <article className="data-feed-console">
          <header><div><span>LINEAGE PIPELINE</span><b>Click a source to inspect its deterministic verdict</b></div><em>{evaluation.missingSourceClasses.length ? `${evaluation.missingSourceClasses.length} MISSING` : "4 REQUIRED CLASSES"}</em></header>
          <div className="data-feed-list">
            {evaluation.feeds.map((feed, index) => (
              <button className={`${feed.status} ${selectedFeed?.id === feed.id ? "selected" : ""}`} type="button" key={feed.id} onClick={() => setSelectedFeedId(feed.id)}>
                <i>{index + 1}</i>
                <span><b>{feed.label}</b><small>{sourceLabel(feed.sourceClass)} · age {formatAge(feed.ageSeconds)}</small></span>
                <em>{feed.status === "trusted" ? "PASS" : feed.status === "review_required" ? "REVIEW" : "BLOCK"}</em>
              </button>
            ))}
            {evaluation.missingSourceClasses.map((sourceClass) => (
              <div className="missing" key={sourceClass}><i>×</i><span><b>{sourceLabel(sourceClass)}</b><small>Required source did not arrive</small></span><em>MISSING</em></div>
            ))}
          </div>
          {selectedFeed ? (
            <div className={`selected-feed-proof ${selectedFeed.status}`} aria-live="polite">
              <header><span>{selectedFeed.signatureStatus === "verified" ? "SIGNATURE VERIFIED" : selectedFeed.signatureStatus.toUpperCase()}</span><em>{selectedFeed.coveragePercent}% coverage · {selectedFeed.recordCount.toLocaleString()} records</em></header>
              <b>{selectedFeed.label}</b>
              <p>{selectedFeed.reasons.join(" · ")}</p>
            </div>
          ) : null}
        </article>

        <aside className={`data-decision-gate ${evaluation.decisionGate}`}>
          <span>CONSEQUENTIAL DECISION GATE</span>
          <h3>{evaluation.decisionGate === "human_review_required" ? "Human review required" : "Operational use blocked"}</h3>
          <p>Autonomous action is always prohibited. Passing data checks permits review of a modeled consequence; it never proves physical road safety.</p>
          <div className="data-gate-state">
            <small>Planning mode</small><b>{evaluation.planningMode.replaceAll("_", " ")}</b>
            <small>Action authority</small><b>{evaluation.autonomousAction}</b>
          </div>
          <ol>
            {(evaluation.blockers.length ? evaluation.blockers.slice(0, 3) : [
              "All four required source classes are present",
              "Integrity, freshness, scope and coverage checks pass",
              "No unresolved cross-source conflict remains",
            ]).map((item, index) => <li key={item}><i>{evaluation.blockers.length ? "!" : "✓"}</i><span>{item}</span>{index === 2 && evaluation.blockers.length > 3 ? <em>+{evaluation.blockers.length - 3}</em> : null}</li>)}
          </ol>
          <button type="button" onClick={() => void downloadEvidence()} disabled={exportState === "working"}><b>{exportState === "working" ? "Hashing evidence…" : exportState === "done" ? "Evidence downloaded" : "Export provenance evidence"}</b><small>Canonical SHA-256 manifest · no source payload</small></button>
        </aside>
      </div>

      <p className="data-trust-boundary">Synthetic, replayable trust fixture evaluated at 2026-07-19 15:00 UTC. The public validation API accepts a strict versioned bundle but stores nothing. Real adapters, keys and data-owner approval remain deployment work.</p>
    </section>
  );
}
