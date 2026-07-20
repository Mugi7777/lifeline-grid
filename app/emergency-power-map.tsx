"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { DEFAULT_NEEDS, VEHICLES, type DispatchPlan } from "@/lib/planner";

interface EmergencyPowerMapProps {
  plan: DispatchPlan;
  blockedRouteIds: string[];
  unavailableVehicleIds: string[];
  inspectedWorldLabel: string | null;
}

type Coordinate = [number, number];

const FACILITY_COORDINATES: Record<string, Coordinate> = {
  clinic: [33.5655, 133.5322],
  shelter: [33.5788, 133.5214],
  water: [33.5527, 133.5687],
};

const VEHICLE_COORDINATES: Record<string, Coordinate> = {
  "E-07": [33.5579, 133.5211],
  "E-12": [33.5681, 133.5452],
  "E-21": [33.5572, 133.5502],
  "E-32": [33.5803, 133.5541],
  "E-44": [33.5467, 133.5445],
};

const BLOCKED_ROUTE_GEOMETRY: Record<string, Coordinate[]> = {
  "river-road": [[33.5579, 133.5211], [33.5614, 133.5265], [33.5655, 133.5322]],
  "clinic-cut": [[33.5681, 133.5452], [33.5667, 133.5384], [33.5655, 133.5322]],
  "north-link": [[33.5681, 133.5452], [33.5741, 133.5354], [33.5788, 133.5214]],
  "east-bridge": [[33.5531, 133.5493], [33.5528, 133.5589], [33.5527, 133.5687]],
  "ridge-bypass": [[33.5467, 133.5445], [33.5487, 133.5564], [33.5527, 133.5687]],
  "west-relay": [[33.5803, 133.5541], [33.5735, 133.538], [33.5655, 133.5322]],
  "charge-link": [[33.5681, 133.5452], [33.562, 133.5431], [33.5572, 133.5502]],
};

const MAP_BOUNDS: [Coordinate, Coordinate] = [[33.539, 133.511], [33.586, 133.578]];

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function missionColor(needId: string) {
  if (needId === "clinic") return "#75e6ff";
  if (needId === "water") return "#ffe07b";
  return "#a9f47a";
}

export default function EmergencyPowerMap({
  plan,
  blockedRouteIds,
  unavailableVehicleIds,
  inspectedWorldLabel,
}: EmergencyPowerMapProps) {
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
        minZoom: 11,
        maxZoom: 18,
      });
      map.fitBounds(MAP_BOUNDS, { padding: [12, 12] });
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

    for (const routeId of blockedRouteIds) {
      const geometry = BLOCKED_ROUTE_GEOMETRY[routeId];
      if (!geometry) continue;
      const line = L.polyline(geometry, {
        color: "#ff5d61",
        weight: 8,
        opacity: 0.9,
        dashArray: "8 8",
        lineCap: "round",
        className: "emergency2-blocked-route",
      }).addTo(overlay);
      line.bindTooltip(`${escapeHtml(routeId)} · MODELED CLOSED`, { sticky: true });
    }

    for (const assignment of plan.assignments) {
      const origin = VEHICLE_COORDINATES[assignment.vehicle.id];
      const destination = FACILITY_COORDINATES[assignment.need.id];
      if (!origin || !destination) continue;
      const midpoint: Coordinate = [
        (origin[0] + destination[0]) / 2 + (assignment.need.id === "shelter" ? 0.004 : -0.002),
        (origin[1] + destination[1]) / 2,
      ];
      const line = L.polyline([origin, midpoint, destination], {
        color: assignment.safe ? missionColor(assignment.need.id) : "#ff5d61",
        weight: assignment.safe ? 4.5 : 5.5,
        opacity: 0.96,
        dashArray: assignment.safe ? "12 8" : "5 7",
        lineCap: "round",
        className: assignment.safe ? "emergency2-mission-route" : "emergency2-mission-route unsafe",
      }).addTo(overlay);
      line.bindPopup(`
        <div class="emergency2-map-popup">
          <span>${assignment.safe ? "VERIFIED SYNTHETIC ASSIGNMENT" : "CONSTRAINT FAILURE"}</span>
          <b>${escapeHtml(assignment.vehicle.id)} → ${escapeHtml(assignment.need.facility)}</b>
          <small>${escapeHtml(assignment.route.routeLabel)} · ${assignment.effectiveOneWayMinutes} min · ${assignment.demandKwh} kWh</small>
          <em>Scenario connector only—not turn-by-turn navigation or a surveyed road state.</em>
        </div>
      `);
    }

    for (const need of DEFAULT_NEEDS) {
      const assignment = plan.assignments.find((item) => item.need.id === need.id);
      const safe = assignment?.safe === true;
      const coordinate = FACILITY_COORDINATES[need.id];
      const marker = L.marker(coordinate, {
        icon: L.divIcon({
          className: "emergency2-node-wrapper",
          html: `<div class="emergency2-facility ${need.priority} ${safe ? "served" : "gap"}"><i>${need.id === "clinic" ? "+" : need.id === "water" ? "W" : "S"}</i><span><b>${escapeHtml(need.facility)}</b><small>${safe ? `${escapeHtml(assignment!.vehicle.id)} · ${assignment!.coverageHours}h verified` : "SERVICE GAP"}</small></span></div>`,
          iconSize: [180, 42],
          iconAnchor: [18, 21],
        }),
      }).addTo(overlay);
      marker.bindPopup(`<div class="emergency2-map-popup"><span>${escapeHtml(need.priority.toUpperCase())} POWER NEED</span><b>${escapeHtml(need.facility)}</b><small>${need.powerKw} kW × ${need.durationHours} h · ${escapeHtml(need.connector)} · ${need.deadlineMinutes} min deadline</small><em>Synthetic facility and demand on a real basemap.</em></div>`);
    }

    for (const vehicle of VEHICLES) {
      const unavailable = unavailableVehicleIds.includes(vehicle.id);
      const assigned = plan.assignments.find((item) => item.vehicle.id === vehicle.id);
      const marker = L.marker(VEHICLE_COORDINATES[vehicle.id], {
        icon: L.divIcon({
          className: "emergency2-vehicle-wrapper",
          html: `<div class="emergency2-vehicle ${unavailable ? "unavailable" : assigned ? "assigned" : "idle"}"><i>${unavailable ? "×" : "⚡"}</i><span><b>${escapeHtml(vehicle.id)}</b><small>${unavailable ? "UNAVAILABLE" : assigned ? `${escapeHtml(assigned.need.id)} · ${vehicle.soc}% SoC` : `reserve · ${vehicle.soc}% SoC`}</small></span></div>`,
          iconSize: [120, 35],
          iconAnchor: [14, 17],
        }),
      }).addTo(overlay);
      marker.bindTooltip(`${vehicle.id} · ${vehicle.capacityKwh} kWh · ${vehicle.maxPowerKw} kW max`);
    }
  }, [blockedRouteIds, plan, ready, unavailableVehicleIds]);

  return (
    <div className={`emergency2-map-frame tile-${tileState}`}>
      <div ref={containerRef} className="emergency2-map" aria-label="OpenStreetMap basemap with synthetic emergency mobile power assignments" />
      <div className="emergency2-map-disclosure">
        <i className={tileState} />
        <span><b>REAL OSM BASEMAP · SYNTHETIC KOCHI EXERCISE</b><small>Fictional facilities, routes, asset state and demand. Not navigation.</small></span>
      </div>
      <button type="button" className="emergency2-map-reset" onClick={() => mapRef.current?.fitBounds(MAP_BOUNDS, { padding: [12, 12] })}>Fit response area</button>
      <div className="emergency2-map-state">
        <small>MAP STATE</small>
        <b>{inspectedWorldLabel ?? "Verified nominal reference"}</b>
        <span>{inspectedWorldLabel ? "Inspection only · no dispatch authority" : "No Sol world applied automatically"}</span>
      </div>
      <div className="emergency2-map-legend"><span><i className="critical" /> critical</span><span><i className="mission" /> assignment</span><span><i className="blocked" /> blocked</span><span><i className="gap" /> gap</span></div>
      {tileState === "degraded" ? <p className="emergency2-map-degraded">Basemap tiles unavailable. The synthetic planning overlay remains visible.</p> : null}
    </div>
  );
}
