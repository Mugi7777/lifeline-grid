"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { NANKAI_SEARCH_ZONES, type NankaiResponseAnalysis } from "@/lib/nankai-response";

interface NankaiResponseMapProps {
  analysis: NankaiResponseAnalysis;
  onInterventionSelect: (roadId: string) => void;
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

function bounds(analysis: NankaiResponseAnalysis): [[number, number], [number, number]] {
  const latitudes = analysis.nodes.map((node) => node.latitude);
  const longitudes = analysis.nodes.map((node) => node.longitude);
  return [[Math.min(...latitudes) - 0.02, Math.min(...longitudes) - 0.025], [Math.max(...latitudes) + 0.02, Math.max(...longitudes) + 0.025]];
}

function roadColor(state: string) {
  if (state === "blocked") return "#d94a43";
  if (state === "unknown") return "#e4a43b";
  if (state === "degraded") return "#a47e41";
  return "#416c5e";
}

export default function NankaiResponseMap({ analysis, onInterventionSelect }: NankaiResponseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const initialBoundsRef = useRef(bounds(analysis));
  const previousViewRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tileState, setTileState] = useState<"loading" | "ready" | "degraded">("loading");

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { attributionControl: true, zoomControl: false, preferCanvas: true, minZoom: 8, maxZoom: 17 });
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
    const viewIdentity = `${analysis.phase}:${analysis.interventionRoadId ?? "none"}`;
    if (previousViewRef.current !== viewIdentity) previousViewRef.current = viewIdentity;

    const nodeById = new Map(analysis.nodes.map((node) => [node.id, node]));
    const clearanceByRoad = new Map(analysis.clearancePriorities.map((item) => [item.road.id, item]));
    const supplyRoads = new Set(analysis.supply.commodities.flatMap((commodity) => commodity.assignments.flatMap((assignment) => assignment.route.roadIds)));
    const powerRoads = new Set(analysis.power.assignments.flatMap((assignment) => assignment.route.roadIds));
    const medicalRoads = new Set(analysis.medical.groundAssignments.flatMap((assignment) => assignment.roadIds));

    for (const road of analysis.roads) {
      const from = nodeById.get(road.from)!;
      const to = nodeById.get(road.to)!;
      const selected = road.id === analysis.interventionRoadId;
      const clearance = clearanceByRoad.get(road.id);
      const line = L.polyline([[from.latitude, from.longitude], [to.latitude, to.longitude]], {
        color: selected ? "#b8f45d" : roadColor(road.activeState),
        weight: selected ? 8 : road.activeState === "blocked" || road.activeState === "unknown" ? 5.5 : 3,
        opacity: selected ? 1 : road.activeState === "blocked" || road.activeState === "unknown" ? 0.9 : 0.72,
        dashArray: selected ? "12 7" : road.activeState === "blocked" ? "8 7" : road.activeState === "unknown" ? "2 7" : undefined,
        lineCap: "round",
        className: selected ? "nankai-road selected" : `nankai-road ${road.activeState}`,
      }).addTo(overlay);
      line.bindPopup(`
        <div class="nankai-map-popup">
          <span>${selected ? "MODELED CLEARANCE INTERVENTION" : `CORRIDOR · ${escapeHtml(road.activeState.toUpperCase())}`}</span>
          <b>${escapeHtml(road.label)}</b>
          <small>${road.minutes} nominal minutes · ${road.clearanceMinutes} modeled clearance minutes</small>
          ${clearance ? `<dl><div><dt>Clearance rank</dt><dd>#${clearance.rank}</dd></div><div><dt>Service sites restored</dt><dd>${clearance.restoredServiceSites}</dd></div><div><dt>Medical cases restored</dt><dd>${clearance.restoredMedicalCases}</dd></div></dl>` : ""}
          <em>Scenario connector only—not a surveyed road state or navigation route.</em>
        </div>
      `);
      if (clearance) line.on("click", () => onInterventionSelect(road.id));

      const missionTone = medicalRoads.has(road.id) ? "#55d8ff" : powerRoads.has(road.id) ? "#f2d35e" : supplyRoads.has(road.id) ? "#73d9ad" : null;
      if (missionTone && road.activeState !== "blocked" && road.activeState !== "unknown") {
        L.polyline([[from.latitude, from.longitude], [to.latitude, to.longitude]], {
          color: missionTone,
          weight: 2.8,
          opacity: 0.96,
          dashArray: "9 7",
          interactive: false,
          lineCap: "round",
          className: "nankai-mission-route",
        }).addTo(overlay);
      }
    }

    for (const zone of NANKAI_SEARCH_ZONES) {
      const target = nodeById.get(zone.targetNodeId)!;
      const assigned = analysis.drone.assignments.find((assignment) => assignment.zoneId === zone.id);
      L.circle([target.latitude, target.longitude], {
        radius: Math.sqrt(zone.areaKm2 / Math.PI) * 1_000,
        color: assigned ? "#6ab9ff" : "#8c6f58",
        weight: assigned ? 2 : 1,
        fillColor: assigned ? "#55aef5" : "#b27a55",
        fillOpacity: assigned ? 0.13 : 0.08,
        dashArray: assigned ? "8 6" : "3 7",
        interactive: true,
        className: assigned ? "nankai-search-zone assigned" : "nankai-search-zone",
      }).bindTooltip(`${escapeHtml(zone.label)} · ${assigned ? `${assigned.droneId} · ${assigned.totalMinutes} min` : "unsearched"}`).addTo(overlay);
      if (assigned) {
        const base = nodeById.get(assigned.baseNodeId)!;
        L.polyline([[base.latitude, base.longitude], [target.latitude, target.longitude]], {
          color: "#6ab9ff",
          weight: 2,
          opacity: 0.9,
          dashArray: "4 8",
          interactive: false,
          className: "nankai-drone-route",
        }).addTo(overlay);
      }
    }

    for (const node of analysis.nodes) {
      const isolated = analysis.isolatedNodeIds.includes(node.id);
      const marker = L.marker([node.latitude, node.longitude], {
        icon: L.divIcon({
          className: "nankai-node-wrapper",
          html: `<div class="nankai-node ${escapeHtml(node.kind)} ${isolated ? "isolated" : ""}"><i>${node.kind === "hospital" ? "+" : node.kind === "airbase" ? "△" : node.kind === "command" ? "C" : "•"}</i><span><b>${escapeHtml(node.label)}</b><small>${isolated ? "GROUND ACCESS UNAVAILABLE" : escapeHtml(node.kind.toUpperCase())}</small></span></div>`,
          iconSize: [170, 38],
          iconAnchor: [14, 19],
        }),
      }).addTo(overlay);
      marker.bindPopup(`<div class="nankai-map-popup"><span>${escapeHtml(node.kind.toUpperCase())}</span><b>${escapeHtml(node.label)}</b><small>${isolated ? "No fail-closed road path from inland command in this modeled phase." : "Reachable through at least one accepted modeled road path."}</small><em>Synthetic facility on a real basemap.</em></div>`);
    }
  }, [analysis, onInterventionSelect, ready]);

  return (
    <div className={`nankai-map-frame tile-${tileState}`}>
      <div ref={containerRef} className="nankai-response-map" aria-label="OpenStreetMap basemap with a synthetic Nankai Trough multi-modal response scenario" />
      <div className="nankai-map-disclosure"><i className={tileState} /><span><b>REAL OSM BASEMAP · SYNTHETIC KOCHI TABLETOP</b><small>Straight scenario connectors, fictional facilities, road state, patients, demand, assets and search zones</small></span></div>
      <button className="nankai-map-reset" type="button" onClick={() => mapRef.current?.fitBounds(bounds(analysis), { padding: [14, 14] })}>Fit response area</button>
      <div className="nankai-map-legend"><span><i className="blocked" /> blocked</span><span><i className="unknown" /> unknown</span><span><i className="supply" /> active mission</span><span><i className="drone" /> drone search</span></div>
      {tileState === "degraded" ? <p className="nankai-map-degraded">Basemap unavailable; synthetic roads, missions and search zones remain visible.</p> : null}
    </div>
  );
}
