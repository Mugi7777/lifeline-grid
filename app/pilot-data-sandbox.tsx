"use client";

import { useState, type ChangeEvent } from "react";
import {
  PILOT_GEOJSON_MAX_BYTES,
  analyzePilotNetwork,
  buildPilotGeoJsonDemo,
  buildPilotNetworkEvidence,
  parsePilotGeoJson,
  type PilotNetworkAnalysis,
} from "@/lib/pilot-data-sandbox";
import PilotNetworkMap from "./pilot-network-map";

function bundledAnalysis() {
  const parsed = parsePilotGeoJson(buildPilotGeoJsonDemo(), "bundled_demo");
  if (!parsed.ok) throw new Error("Bundled pilot fixture is invalid");
  return analyzePilotNetwork(parsed.network);
}

const INITIAL_ANALYSIS = bundledAnalysis();

function elapsedMilliseconds(start: number) {
  return Math.max(0.1, Number((performance.now() - start).toFixed(1)));
}

export default function PilotDataSandbox() {
  const [analysis, setAnalysis] = useState<PilotNetworkAnalysis>(INITIAL_ANALYSIS);
  const [selectedBridgeId, setSelectedBridgeId] = useState<string | null>(INITIAL_ANALYSIS.bridgeSegments[0]?.segment.id ?? null);
  const [fileLabel, setFileLabel] = useState("Bundled Gujo tabletop fixture");
  const [message, setMessage] = useState("Deterministic demo loaded. Choose a GeoJSON file to analyze a de-identified pilot network locally.");
  const [state, setState] = useState<"ready" | "working" | "error">("ready");
  const [computeMs, setComputeMs] = useState<number | null>(null);
  const [exportState, setExportState] = useState<"ready" | "working" | "done">("ready");

  function loadBundledDemo() {
    const start = performance.now();
    const next = bundledAnalysis();
    setAnalysis(next);
    setSelectedBridgeId(next.bridgeSegments[0]?.segment.id ?? null);
    setFileLabel("Bundled Gujo tabletop fixture");
    setMessage("Synthetic fixture restored. All accepted segments were evaluated by the same bounded kernel used for local files.");
    setComputeMs(elapsedMilliseconds(start));
    setState("ready");
  }

  async function analyzeFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setState("working");
    setMessage("Reading and validating the file inside this browser tab…");
    try {
      if (file.size > PILOT_GEOJSON_MAX_BYTES) throw new Error(`File exceeds the ${(PILOT_GEOJSON_MAX_BYTES / 1_000_000).toFixed(0)} MB local-processing limit.`);
      const text = await file.text();
      if (new Blob([text]).size > PILOT_GEOJSON_MAX_BYTES) throw new Error("Decoded file exceeds the local-processing limit.");
      const start = performance.now();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("The selected file is not valid JSON.");
      }
      const parsed = parsePilotGeoJson(payload, "local_file");
      if (!parsed.ok) throw new Error(`${parsed.message}${parsed.issues.length ? ` First finding: ${parsed.issues[0]}.` : ""}`);
      const next = analyzePilotNetwork(parsed.network);
      setAnalysis(next);
      setSelectedBridgeId(next.bridgeSegments[0]?.segment.id ?? null);
      setFileLabel(file.name.slice(0, 120));
      setComputeMs(elapsedMilliseconds(start));
      setMessage(parsed.network.rejectedFeatures
        ? `${parsed.network.acceptedFeatures.toLocaleString()} features accepted; ${parsed.network.rejectedFeatures.toLocaleString()} isolated for review. No file bytes left this tab.`
        : `${parsed.network.acceptedFeatures.toLocaleString()} features accepted. No file bytes left this tab.`);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local analysis failed closed.");
      setState("error");
    } finally {
      input.value = "";
    }
  }

  async function downloadEvidence() {
    setExportState("working");
    const evidence = await buildPilotNetworkEvidence(analysis);
    const payload = JSON.stringify(evidence, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lifeline-pilot-evidence-${analysis.network.regionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportState("done");
    window.setTimeout(() => setExportState("ready"), 1600);
  }

  const selectedBridge = analysis.bridgeSegments.find((bridge) => bridge.segment.id === selectedBridgeId) ?? analysis.bridgeSegments[0] ?? null;
  const sourceStatus = analysis.network.sourceMode === "bundled_demo" ? "SYNTHETIC FIXTURE" : "UNVERIFIED LOCAL FILE";

  return (
    <section className="panel pilot-sandbox-panel" aria-labelledby="pilot-sandbox-title">
      <div className="pilot-sandbox-heading">
        <div>
          <p className="panel-kicker">PILOT DATA SANDBOX × LOCAL GEOJSON GRAPH ANALYSIS</p>
          <h2 id="pilot-sandbox-title">Turn a municipality road file into inspectable access-risk evidence.</h2>
          <p>Load bounded, segmentized LineString roads. Lifeline Grid validates the file, builds an endpoint graph, and identifies bridges and articulation points without sending the source file to a server.</p>
        </div>
        <span className="pilot-local-badge"><i />LOCAL PROCESSING · NO UPLOAD</span>
      </div>

      <div className="pilot-file-toolbar">
        <label className={state === "working" ? "disabled" : ""}>
          <input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => void analyzeFile(event)} disabled={state === "working"} />
          <i>＋</i><span><b>{state === "working" ? "Analyzing inside browser…" : "Analyze local GeoJSON"}</b><small>LineString / MultiLineString · max 10 MB · max 10,000 features</small></span><em>CHOOSE FILE</em>
        </label>
        <button type="button" onClick={loadBundledDemo}><i>↺</i><span><b>Load bundled demo</b><small>Real OSM-derived geometry + synthetic attributes</small></span><em>RESET</em></button>
        <div className={`pilot-file-state ${state}`} aria-live="polite"><span>{fileLabel}</span><p>{message}</p></div>
      </div>

      <div className="pilot-proof-strip" aria-label="Local topology analysis metrics">
        <span><b>{analysis.network.acceptedFeatures.toLocaleString()}</b><small>features accepted</small></span>
        <span><b>{analysis.network.segments.length.toLocaleString()}</b><small>road segments</small></span>
        <span><b>{analysis.network.nodes.length.toLocaleString()}</b><small>endpoint nodes</small></span>
        <span className="risk"><b>{analysis.bridgeSegments.length.toLocaleString()}</b><small>single-point roads</small></span>
        <span><b>{analysis.articulationNodeIds.length.toLocaleString()}</b><small>articulation nodes</small></span>
        <span><b>{computeMs === null ? "FIXTURE" : `${computeMs} ms`}</b><small>local parse + analysis</small></span>
      </div>

      <div className="pilot-sandbox-workspace">
        <article className="pilot-map-card">
          <header><div><span>IMPORTED NETWORK EXTENT</span><b>{analysis.network.sourceLabel}</b></div><em>{sourceStatus}</em></header>
          <PilotNetworkMap analysis={analysis} selectedBridgeId={selectedBridge?.segment.id ?? null} onBridgeSelect={setSelectedBridgeId} />
        </article>

        <aside className="pilot-risk-rail">
          <header><div><span>BRIDGE-RISK RANKING</span><b>Roads whose removal splits the endpoint graph</b></div><em>{analysis.evidence.complexity}</em></header>
          <div className="pilot-risk-list">
            {analysis.bridgeSegments.slice(0, 8).map((bridge) => (
              <button className={selectedBridge?.segment.id === bridge.segment.id ? "selected" : ""} type="button" key={bridge.segment.id} onClick={() => setSelectedBridgeId(bridge.segment.id)}>
                <i>{bridge.rank}</i><span><b>{bridge.segment.label}</b><small>{bridge.exposedNodeCount} nodes exposed · condition {bridge.segment.conditionGrade ?? "missing"}</small></span><em>{bridge.riskScore}</em>
              </button>
            ))}
            {analysis.bridgeSegments.length === 0 ? <div className="pilot-no-risk"><b>No bridge segment detected</b><span>This proves only that no single accepted segment disconnects the endpoint graph.</span></div> : null}
          </div>
          {selectedBridge ? (
            <div className="pilot-selected-risk" aria-live="polite">
              <span>SELECTED TOPOLOGY FINDING</span>
              <h3>#{selectedBridge.rank} · {selectedBridge.segment.label}</h3>
              <dl><div><dt>Exposed nodes</dt><dd>{selectedBridge.exposedNodeCount}/{selectedBridge.componentNodeCount}</dd></div><div><dt>Condition grade</dt><dd>{selectedBridge.segment.conditionGrade ?? "not supplied"}</dd></div><div><dt>Weight limit</dt><dd>{selectedBridge.segment.weightLimitT === null ? "not supplied" : `${selectedBridge.segment.weightLimitT} t`}</dd></div></dl>
              <p>Inspect this corridor first in a tabletop exercise. The graph result is not a structural diagnosis or closure instruction.</p>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="pilot-evidence-row">
        <article className={analysis.tabletopMode === "ready" ? "ready" : "review"}>
          <span>TABLETOP DATA GATE</span><b>{analysis.tabletopMode === "ready" ? "READY FOR DE-IDENTIFIED EXERCISE" : "REVIEW METADATA / REJECTED FEATURES"}</b>
          <p>{analysis.network.acceptedFeatures}/{analysis.network.inputFeatures} features accepted · {analysis.metadataCompletenessPercent}% condition/weight metadata · {analysis.connectedComponents} connected component{analysis.connectedComponents === 1 ? "" : "s"}</p>
        </article>
        <article className="blocked"><span>FIELD DECISION GATE</span><b>BLOCKED</b><p>Local files are unverified. A qualified authority must validate source, topology, road state, restrictions and operational use.</p></article>
        <article className="pilot-evidence-export">
          <span>REPRODUCIBLE EVIDENCE</span><code>{analysis.network.fingerprint}</code><p>{analysis.evidence.nodeVisits.toLocaleString()} node visits · {analysis.evidence.adjacencyTraversals.toLocaleString()} adjacency traversals · all accepted segments evaluated</p>
          <button type="button" onClick={() => void downloadEvidence()} disabled={exportState === "working"}>{exportState === "working" ? "Hashing evidence…" : exportState === "done" ? "Evidence downloaded" : "Export SHA-256 evidence JSON"}</button>
        </article>
      </div>

      <p className="pilot-sandbox-boundary">Privacy boundary: the selected file is parsed in this browser tab and is not sent by this feature. Safety boundary: endpoint snapping does not infer crossings or grade separation; supply a segmentized, de-identified network and obtain data-owner approval before any pilot. OpenStreetMap tiles are requested separately for the basemap.</p>
    </section>
  );
}
