"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { PilotNetworkAnalysis } from "@/lib/pilot-data-sandbox";

interface PilotNetworkMapProps {
  analysis: PilotNetworkAnalysis;
  selectedBridgeId: string | null;
  onBridgeSelect: (segmentId: string) => void;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function analysisBounds(analysis: PilotNetworkAnalysis): [[number, number], [number, number]] {
  const { south, west, north, east } = analysis.network.bounds;
  const latitudePad = Math.max((north - south) * 0.04, 0.001);
  const longitudePad = Math.max((east - west) * 0.04, 0.001);
  return [
    [south - latitudePad, west - longitudePad],
    [north + latitudePad, east + longitudePad],
  ];
}

export default function PilotNetworkMap({ analysis, selectedBridgeId, onBridgeSelect }: PilotNetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const lastFingerprintRef = useRef<string | null>(null);
  const initialBoundsRef = useRef(analysisBounds(analysis));
  const [mapReady, setMapReady] = useState(false);
  const [tileState, setTileState] = useState<"loading" | "ready" | "degraded">("loading");

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: false,
        preferCanvas: true,
        minZoom: 3,
        maxZoom: 19,
      });
      map.fitBounds(initialBoundsRef.current, { padding: [14, 14] });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
        maxZoom: 19,
        crossOrigin: true,
      });
      tiles.once("load", () => setTileState("ready"));
      tiles.on("tileerror", () => setTileState("degraded"));
      tiles.addTo(map);
      overlayRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      setMapReady(true);
    }).catch(() => setTileState("degraded"));

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const overlay = overlayRef.current;
    if (!mapReady || !L || !overlay) return;
    overlay.clearLayers();

    if (lastFingerprintRef.current !== analysis.network.fingerprint) {
      mapRef.current?.fitBounds(analysisBounds(analysis), { padding: [14, 14] });
      lastFingerprintRef.current = analysis.network.fingerprint;
    }

    const bridgesById = new Map(analysis.bridgeSegments.map((bridge) => [bridge.segment.id, bridge]));
    const ordinarySegments = analysis.network.segments.filter((segment) => !bridgesById.has(segment.id));
    const ordinaryStride = Math.max(1, Math.ceil(ordinarySegments.length / 2_500));
    const renderedIds = new Set(ordinarySegments.filter((_, index) => index % ordinaryStride === 0).map((segment) => segment.id));
    for (const bridge of analysis.bridgeSegments) renderedIds.add(bridge.segment.id);

    for (const segment of analysis.network.segments) {
      if (!renderedIds.has(segment.id)) continue;
      const bridge = bridgesById.get(segment.id);
      const selected = segment.id === selectedBridgeId;
      const conditionRisk = (segment.conditionGrade ?? 0) >= 4;
      const line = L.polyline(segment.coordinates.map(([longitude, latitude]) => L.latLng(latitude, longitude)), {
        color: selected ? "#ff453a" : bridge ? "#e45b4f" : conditionRisk ? "#d8973c" : "#2c745e",
        weight: selected ? 7 : bridge ? 4.8 : conditionRisk ? 2.6 : 1.8,
        opacity: selected ? 1 : bridge ? 0.92 : conditionRisk ? 0.66 : 0.38,
        dashArray: selected ? "11 7" : undefined,
        interactive: Boolean(bridge),
        lineCap: "round",
        className: selected ? "pilot-map-road selected" : bridge ? "pilot-map-road bridge" : "pilot-map-road",
      }).addTo(overlay);
      if (bridge) {
        line.bindPopup(`
          <div class="pilot-map-popup">
            <span>SINGLE-POINT ACCESS RISK #${bridge.rank}</span>
            <b>${escapeHtml(segment.label)}</b>
            <small>${escapeHtml(segment.id)} · condition ${segment.conditionGrade ?? "missing"} · ${segment.weightLimitT ?? "missing"} t</small>
            <dl><div><dt>Exposed graph nodes</dt><dd>${bridge.exposedNodeCount}</dd></div><div><dt>Risk rank score</dt><dd>${bridge.riskScore}</dd></div><div><dt>File authority</dt><dd>${escapeHtml(segment.authorityStatus)}</dd></div></dl>
            <em>Topology finding only—field verification remains required.</em>
          </div>
        `);
        line.on("click", () => onBridgeSelect(segment.id));
      }
    }

    const articulationIds = new Set(analysis.articulationNodeIds);
    for (const node of analysis.network.nodes) {
      if (!articulationIds.has(node.id)) continue;
      L.circleMarker([node.latitude, node.longitude], {
        radius: 5.5,
        color: "#ffffff",
        weight: 2,
        fillColor: "#07110f",
        fillOpacity: 1,
        interactive: true,
        className: "pilot-map-articulation",
      }).bindTooltip(`Articulation node · degree ${node.degree}`).addTo(overlay);
    }
  }, [analysis, mapReady, onBridgeSelect, selectedBridgeId]);

  const bridgeIds = new Set(analysis.bridgeSegments.map((bridge) => bridge.segment.id));
  const ordinaryCount = analysis.network.segments.length - bridgeIds.size;
  const ordinaryStride = Math.max(1, Math.ceil(ordinaryCount / 2_500));
  const renderedOrdinary = Math.ceil(ordinaryCount / ordinaryStride);

  return (
    <div className={`pilot-map-frame tile-${tileState}`}>
      <div ref={containerRef} className="pilot-network-map" aria-label="OpenStreetMap basemap showing locally analyzed GeoJSON road topology" />
      <div className="pilot-map-disclosure">
        <i className={tileState} />
        <span><b>REAL OSM BASEMAP · LOCAL FILE OVERLAY</b><small>{analysis.network.segments.length.toLocaleString()} segments computed · {(renderedOrdinary + bridgeIds.size).toLocaleString()} displayed for browser performance</small></span>
      </div>
      <button className="pilot-map-reset" type="button" onClick={() => mapRef.current?.fitBounds(analysisBounds(analysis), { padding: [14, 14] })}>Fit imported extent</button>
      <div className="pilot-map-legend" aria-label="Pilot map legend"><span><i className="bridge" /> single-point risk</span><span><i className="condition" /> condition 4–5</span><span><i className="ordinary" /> other road</span></div>
      {tileState === "degraded" ? <p className="pilot-map-degraded">Basemap tiles are unavailable. The local topology overlay remains visible and computed.</p> : null}
    </div>
  );
}
