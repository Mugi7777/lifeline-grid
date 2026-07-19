"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { RegionalAnalysis, RoadCriticality } from "@/lib/regional";
import { coordinateForNode, geometryForRoad, PILOT_GEOGRAPHY } from "@/lib/pilot-geography";

interface RealRegionalMapProps {
  analysis: RegionalAnalysis;
  closedSegmentId: string | null;
  onRoadSelect: (roadId: string) => void;
}

function roadTone(item: RoadCriticality) {
  if (item.rank === 1) return "#d4453f";
  if (item.road.conditionGrade >= 4) return "#d57f36";
  if (item.road.conditionGrade === 3) return "#a78a45";
  return "#70837a";
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

function pilotBounds(): [[number, number], [number, number]] {
  const [[south, west], [north, east]] = PILOT_GEOGRAPHY.bounds;
  return [[south, west], [north, east]];
}

export default function RealRegionalMap({ analysis, closedSegmentId, onRoadSelect }: RealRegionalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileState, setTileState] = useState<"loading" | "ready" | "degraded">("loading");

  const activeClosure = useMemo(
    () => analysis.roadCriticality.find((item) => item.road.id === closedSegmentId) ?? null,
    [analysis.roadCriticality, closedSegmentId],
  );

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
      map.fitBounds(pilotBounds(), { padding: [16, 16] });
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

    const criticality = new Map(analysis.roadCriticality.map((item) => [item.road.id, item]));
    const usedRoads = new Set(analysis.activePlan.routes.flatMap((route) => route.usedRoadSegmentIds));
    const repairedRoads = new Set(analysis.repairPortfolio.selectedRoads.map((item) => item.road.id));
    const routeColor = new Map<string, string>();
    for (const route of analysis.activePlan.routes) {
      for (const roadId of route.usedRoadSegmentIds) if (!routeColor.has(roadId)) routeColor.set(roadId, route.vehicle.color);
    }

    for (const road of analysis.model.roads) {
      const item = criticality.get(road.id)!;
      const coordinates = geometryForRoad(road, analysis.model.nodes).map(([latitude, longitude]) => L.latLng(latitude, longitude));
      const isClosed = road.id === closedSegmentId;

      if (repairedRoads.has(road.id)) {
        L.polyline(coordinates, {
          color: "#b8f45d",
          weight: 11,
          opacity: 0.56,
          interactive: false,
          lineCap: "round",
        }).addTo(overlay);
      }

      const baseRoad = L.polyline(coordinates, {
        color: isClosed ? "#c93e38" : roadTone(item),
        weight: isClosed ? 7 : item.rank === 1 ? 5 : 3.5,
        opacity: isClosed ? 1 : 0.88,
        dashArray: isClosed ? "10 8" : undefined,
        lineCap: "round",
        className: isClosed ? "real-map-road closed" : "real-map-road",
      }).addTo(overlay);

      baseRoad.bindPopup(`
        <div class="real-map-popup">
          <span>ROAD IMPACT #${item.rank}</span>
          <b>${escapeHtml(road.label)}</b>
          <small>Condition ${road.conditionGrade} · ${(road.annualFailureProbability * 100).toFixed(1)}% modeled annual failure risk</small>
          <dl><div><dt>Households at risk</dt><dd>${item.householdsAtRisk}</dd></div><div><dt>Priority residents</dt><dd>${item.vulnerableResidentsAtRisk}</dd></div><div><dt>Weight limit</dt><dd>${road.weightLimitT} t</dd></div></dl>
          <em>Clicking a modeled road applies an N-1 closure scenario.</em>
        </div>
      `);
      baseRoad.on("click", () => onRoadSelect(road.id));

      if (usedRoads.has(road.id) && !isClosed) {
        L.polyline(coordinates, {
          color: routeColor.get(road.id) ?? "#176b55",
          weight: 4.6,
          opacity: 0.96,
          dashArray: "12 9",
          interactive: false,
          lineCap: "round",
          className: "real-map-active-route",
        }).addTo(overlay);
      }

      if (isClosed) {
        const midpoint = coordinates[Math.floor(coordinates.length / 2)];
        L.marker(midpoint, {
          interactive: false,
          icon: L.divIcon({
            className: "real-map-closure-wrapper",
            html: '<div class="real-map-closure"><i>×</i><span>MODELED CLOSURE</span></div>',
            iconSize: [124, 28],
            iconAnchor: [62, 14],
          }),
        }).addTo(overlay);
      }
    }

    for (const node of analysis.model.nodes) {
      const demand = analysis.model.demands.find((item) => item.nodeId === node.id);
      const failed = Boolean(demand && (
        analysis.activePlan.metrics.unservedDemandIds.includes(demand.id)
        || analysis.activePlan.metrics.lateDemandIds.includes(demand.id)
      ));
      const [latitude, longitude] = coordinateForNode(node);
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "real-map-node-wrapper",
          html: `<div class="real-map-node ${node.kind} ${failed ? "failed" : ""}"><i>${node.kind === "hub" ? "H" : node.kind === "clinic" ? "+" : "•"}</i><span><b>${escapeHtml(node.label)}</b><small>${demand ? `${demand.households} hh · ${demand.vulnerableResidents} priority` : "shared depot"}</small></span></div>`,
          iconSize: [150, 38],
          iconAnchor: [14, 19],
        }),
      }).addTo(overlay);
      marker.bindPopup(`
        <div class="real-map-popup">
          <span>${escapeHtml(node.kind.toUpperCase())}</span>
          <b>${escapeHtml(node.label)}</b>
          <small>${demand ? `${demand.households} households · ${demand.vulnerableResidents} priority residents · ${demand.parcels} parcels` : "Shared multi-operator logistics depot"}</small>
          <em>Synthetic operations layer on real geography.</em>
        </div>
      `);
    }
  }, [analysis, closedSegmentId, mapReady, onRoadSelect]);

  return (
    <div className={`real-map-frame tile-${tileState}`}>
      <div ref={containerRef} className="real-regional-map" aria-label="Interactive real OpenStreetMap basemap with a synthetic regional access scenario" />
      <div className="real-map-disclosure">
        <i className={tileState} />
        <span><b>{PILOT_GEOGRAPHY.label}</b><small>{PILOT_GEOGRAPHY.disclosure}</small></span>
      </div>
      <button className="real-map-reset" type="button" onClick={() => mapRef.current?.fitBounds(pilotBounds(), { padding: [16, 16] })}>
        Fit district
      </button>
      <div className="real-map-compute" aria-label="Computation performed for this map state">
        <span><b>{analysis.evidence.deliveryCandidateAssignments.toLocaleString()}</b><small>fleet assignments</small></span>
        <span><b>{analysis.evidence.nMinusOneRoadCases}</b><small>N-1 road cases</small></span>
        <span><b>{analysis.evidence.stressScenarios}</b><small>stress worlds</small></span>
        <span><b>{analysis.repairPortfolio.portfoliosEvaluated}</b><small>repair portfolios</small></span>
        <em>{analysis.activePlan.optimalityCertified ? "EXACT OPTIMUM" : "BOUNDED PLAN"}</em>
      </div>
      <div className={`regional-map-callout ${activeClosure ? "failure" : "baseline"}`}>
        <span>{activeClosure ? "!" : "✓"}</span>
        <div>
          <b>{activeClosure ? `${activeClosure.road.label} removed from the road graph` : "All modeled communities remain connected"}</b>
          <small>{activeClosure ? `${activeClosure.vulnerableResidentsAtRisk} priority residents · ${activeClosure.householdsAtRisk} households lose on-time access` : `${analysis.activePlan.search.candidatesEvaluated.toLocaleString()} route candidates evaluated · pan, zoom or select a road`}</small>
        </div>
      </div>
      {tileState === "degraded" ? <p className="real-map-degraded">Basemap tiles are unavailable. The verified operational overlay remains interactive.</p> : null}
    </div>
  );
}
