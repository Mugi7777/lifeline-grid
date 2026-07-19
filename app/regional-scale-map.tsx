"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { RegionalScaleProof, ScaleCorridorImpact } from "@/lib/regional-scale";
import { PILOT_GEOGRAPHY } from "@/lib/pilot-geography";

interface RegionalScaleMapProps {
  proof: RegionalScaleProof;
  selectedImpact: ScaleCorridorImpact;
  onCorridorSelect: (edgeId: string) => void;
}

function mapBounds(): [[number, number], [number, number]] {
  const [[south, west], [north, east]] = PILOT_GEOGRAPHY.bounds;
  return [[south, west], [north, east]];
}

export default function RegionalScaleMap({ proof, selectedImpact, onCorridorSelect }: RegionalScaleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
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
        minZoom: 9,
        maxZoom: 17,
      });
      map.fitBounds(mapBounds(), { padding: [15, 15] });
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
      setReady(true);
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
    if (!ready || !L || !overlay) return;
    overlay.clearLayers();
    const network = proof.network;
    const affected = new Set(selectedImpact.affectedNodeIds);
    const rankedById = new Map(proof.rankedCorridors.map((impact, index) => [impact.edge.id, { impact, index }]));
    const edgeStride = Math.max(1, Math.ceil(network.edges.length / 1_900));
    const nodeStride = Math.max(1, Math.ceil(network.nodes.length / 1_100));

    network.edges.forEach((edge, edgeIndex) => {
      const ranked = rankedById.get(edge.id);
      const selected = edge.id === selectedImpact.edge.id;
      if (!selected && !ranked && !edge.corridor && edgeIndex % edgeStride !== 0) return;
      const from = network.nodes[edge.from];
      const to = network.nodes[edge.to];
      const line = L.polyline([[from.latitude, from.longitude], [to.latitude, to.longitude]], {
        color: selected ? "#c93e38" : ranked ? "#d57f36" : edge.corridor ? "#176b55" : "#52655d",
        weight: selected ? 7 : ranked ? Math.max(2.6, 4.5 - ranked.index * 0.25) : edge.corridor ? 2.7 : 1.1,
        opacity: selected ? 1 : ranked ? 0.84 : edge.corridor ? 0.58 : 0.22,
        dashArray: selected ? "10 7" : undefined,
        interactive: Boolean(ranked),
        lineCap: "round",
        className: selected ? "scale-map-selected-link" : ranked ? "scale-map-ranked-link" : "scale-map-link",
      }).addTo(overlay);
      if (ranked) {
        line.bindTooltip(`#${ranked.index + 1} corridor · ${ranked.impact.householdsLost.toLocaleString()} households exposed`);
        line.on("click", () => onCorridorSelect(edge.id));
      }
    });

    network.nodes.forEach((node, nodeIndex) => {
      const isAffected = affected.has(node.id);
      const isHub = node.kind === "hub";
      const isClinic = node.kind === "clinic";
      if (!isAffected && !isHub && !isClinic && nodeIndex % nodeStride !== 0) return;
      const marker = L.circleMarker([node.latitude, node.longitude], {
        radius: isHub || isClinic ? 7 : isAffected ? 3.2 : 1.6,
        color: "#ffffff",
        weight: isHub || isClinic ? 2 : isAffected ? 1 : 0,
        fillColor: isHub ? "#07110f" : isClinic ? "#c93e38" : isAffected ? "#e05a4e" : "#176b55",
        fillOpacity: isHub || isClinic ? 1 : isAffected ? 0.82 : 0.38,
        interactive: isHub || isClinic || isAffected,
        className: isAffected ? "scale-map-affected-node" : "scale-map-node",
      }).addTo(overlay);
      if (isHub || isClinic || isAffected) marker.bindTooltip(`${node.id} · ${node.households} households · ${node.vulnerableResidents} priority residents`);
    });

    const edge = selectedImpact.edge;
    const midpoint = {
      latitude: (network.nodes[edge.from].latitude + network.nodes[edge.to].latitude) / 2,
      longitude: (network.nodes[edge.from].longitude + network.nodes[edge.to].longitude) / 2,
    };
    L.marker([midpoint.latitude, midpoint.longitude], {
      interactive: false,
      icon: L.divIcon({
        className: "scale-map-closure-wrapper",
        html: `<div class="scale-map-closure"><i>×</i><span>#${proof.rankedCorridors.findIndex((impact) => impact.edge.id === edge.id) + 1} FAILURE REPLAY</span></div>`,
        iconSize: [130, 28],
        iconAnchor: [65, 14],
      }),
    }).addTo(overlay);
  }, [onCorridorSelect, proof, ready, selectedImpact]);

  const edgeStride = Math.max(1, Math.ceil(proof.network.edges.length / 1_900));
  const nodeStride = Math.max(1, Math.ceil(proof.network.nodes.length / 1_100));
  const renderedEdges = Math.ceil(proof.network.edges.length / edgeStride);
  const renderedNodes = Math.ceil(proof.network.nodes.length / nodeStride);

  return (
    <div className={`scale-map-frame tile-${tileState}`}>
      <div ref={containerRef} className="scale-regional-map" aria-label="Interactive OpenStreetMap scale proof with a synthetic multi-thousand-zone network" />
      <div className="scale-map-disclosure">
        <i className={tileState} />
        <span><b>REAL BASEMAP · SYNTHETIC SCALE NETWORK</b><small>{proof.network.nodes.length.toLocaleString()} zones and {proof.network.edges.length.toLocaleString()} links computed · {renderedNodes.toLocaleString()} nodes and {renderedEdges.toLocaleString()} base links sampled for mobile rendering</small></span>
      </div>
      <button className="scale-map-reset" type="button" onClick={() => mapRef.current?.fitBounds(mapBounds(), { padding: [15, 15] })}>Fit region</button>
      {tileState === "degraded" ? <p className="scale-map-degraded">Basemap unavailable; the computed network remains visible.</p> : null}
    </div>
  );
}
