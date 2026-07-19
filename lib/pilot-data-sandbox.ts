import { sha256Hex } from "./regional-contract.ts";
import { PILOT_GEOGRAPHY } from "./pilot-geography.ts";
import { REGIONAL_MODEL } from "./regional.ts";

export const PILOT_GEOJSON_POLICY_VERSION = "2026-07-19.1";
export const PILOT_GEOJSON_MAX_FEATURES = 10_000;
export const PILOT_GEOJSON_MAX_COORDINATES = 200_000;
export const PILOT_GEOJSON_MAX_BYTES = 10_000_000;
export const PILOT_ENDPOINT_PRECISION = 4;

export type PilotCoordinate = [longitude: number, latitude: number];

export interface PilotRoadSegment {
  id: string;
  parentFeatureId: string;
  label: string;
  coordinates: PilotCoordinate[];
  fromNodeId: string;
  toNodeId: string;
  conditionGrade: number | null;
  weightLimitT: number | null;
  authorityStatus: "declared" | "unverified";
}

export interface PilotGraphNode {
  id: string;
  longitude: number;
  latitude: number;
  degree: number;
  componentId: number;
}

export interface PilotGeoJsonNetwork {
  policyVersion: typeof PILOT_GEOJSON_POLICY_VERSION;
  sourceLabel: string;
  sourceMode: "bundled_demo" | "local_file";
  regionId: string;
  license: string;
  observedAt: string | null;
  authorityStatus: "synthetic_demo" | "unverified_local_file";
  inputFeatures: number;
  acceptedFeatures: number;
  rejectedFeatures: number;
  coordinateCount: number;
  segments: PilotRoadSegment[];
  nodes: PilotGraphNode[];
  bounds: { south: number; west: number; north: number; east: number };
  issues: string[];
  fingerprint: string;
}

export interface PilotBridgeImpact {
  rank: number;
  segment: PilotRoadSegment;
  exposedNodeCount: number;
  componentNodeCount: number;
  riskScore: number;
}

export interface PilotNetworkAnalysis {
  network: PilotGeoJsonNetwork;
  connectedComponents: number;
  largestComponentNodes: number;
  bridgeSegments: PilotBridgeImpact[];
  articulationNodeIds: string[];
  isolatedNodeCount: number;
  metadataCompletenessPercent: number;
  fieldDecisionGate: "blocked";
  tabletopMode: "ready" | "review_required";
  evidence: {
    algorithm: "Iterative Tarjan low-link + deterministic bridge-risk ranking";
    complexity: "O(V + E + B log B)";
    nodeVisits: number;
    adjacencyTraversals: number;
    endpointSnapPrecision: number;
    allSegmentsEvaluated: number;
  };
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, fallback: string, max = 160) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length ? normalized.slice(0, max) : fallback;
}

function identifier(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(normalized) ? normalized : null;
}

function finiteNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function parseCoordinate(value: unknown): PilotCoordinate | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = finiteNumber(value[0], -180, 180);
  const latitude = finiteNumber(value[1], -90, 90);
  return longitude === null || latitude === null ? null : [longitude, latitude];
}

function parseLine(value: unknown): PilotCoordinate[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > PILOT_GEOJSON_MAX_COORDINATES) return null;
  const coordinates = value.map(parseCoordinate);
  return coordinates.some((coordinate) => coordinate === null) ? null : coordinates as PilotCoordinate[];
}

function endpointId([longitude, latitude]: PilotCoordinate) {
  const snappedLongitude = Number(longitude.toFixed(PILOT_ENDPOINT_PRECISION));
  const snappedLatitude = Number(latitude.toFixed(PILOT_ENDPOINT_PRECISION));
  return `n:${snappedLatitude.toFixed(PILOT_ENDPOINT_PRECISION)}:${snappedLongitude.toFixed(PILOT_ENDPOINT_PRECISION)}`;
}

function fingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a:${hash.toString(16).padStart(8, "0")}`;
}

function stableNetworkInput(segments: PilotRoadSegment[]) {
  return segments.map((segment) => ({
    id: segment.id,
    fromNodeId: segment.fromNodeId,
    toNodeId: segment.toNodeId,
    conditionGrade: segment.conditionGrade,
    weightLimitT: segment.weightLimitT,
    coordinates: segment.coordinates,
  }));
}

function metadataFromRoot(root: JsonRecord, sourceMode: PilotGeoJsonNetwork["sourceMode"]) {
  const lifeline = isRecord(root.lifeline) ? root.lifeline : {};
  const observedAt = typeof lifeline.observedAt === "string" && Number.isFinite(Date.parse(lifeline.observedAt))
    ? new Date(lifeline.observedAt).toISOString()
    : null;
  return {
    sourceLabel: boundedText(lifeline.sourceLabel ?? root.name, sourceMode === "bundled_demo" ? "Gujo tabletop road fixture" : "Local GeoJSON file"),
    regionId: identifier(lifeline.regionId) ?? "unscoped-local-import",
    license: boundedText(lifeline.license, "license-not-declared"),
    observedAt,
  };
}

export function parsePilotGeoJson(value: unknown, sourceMode: PilotGeoJsonNetwork["sourceMode"] = "local_file"):
  | { ok: true; network: PilotGeoJsonNetwork }
  | { ok: false; code: "invalid_geojson" | "feature_limit" | "coordinate_limit" | "no_usable_segments"; message: string; issues: string[] } {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    return { ok: false, code: "invalid_geojson", message: "Expected a GeoJSON FeatureCollection.", issues: [] };
  }
  if (value.features.length === 0 || value.features.length > PILOT_GEOJSON_MAX_FEATURES) {
    return { ok: false, code: "feature_limit", message: `Feature count must be between 1 and ${PILOT_GEOJSON_MAX_FEATURES}.`, issues: [] };
  }

  const metadata = metadataFromRoot(value, sourceMode);
  const segments: PilotRoadSegment[] = [];
  const issues: string[] = [];
  const ids = new Set<string>();
  let coordinateCount = 0;
  let acceptedFeatures = 0;
  let coordinateLimitExceeded = false;

  value.features.forEach((feature, featureIndex) => {
    if (!isRecord(feature) || feature.type !== "Feature" || !isRecord(feature.geometry)) {
      issues.push(`Feature ${featureIndex + 1}: malformed feature or geometry`);
      return;
    }
    const properties = isRecord(feature.properties) ? feature.properties : {};
    const baseId = identifier(properties.segment_id ?? feature.id);
    if (!baseId) {
      issues.push(`Feature ${featureIndex + 1}: stable segment_id or feature id is required`);
      return;
    }
    const geometryType = feature.geometry.type;
    const rawLines = geometryType === "LineString"
      ? [feature.geometry.coordinates]
      : geometryType === "MultiLineString" && Array.isArray(feature.geometry.coordinates)
        ? feature.geometry.coordinates
        : null;
    if (!rawLines || rawLines.length === 0 || rawLines.length > 1_000) {
      issues.push(`Feature ${featureIndex + 1}: only bounded LineString or MultiLineString roads are supported`);
      return;
    }
    const parsedLines = rawLines.map(parseLine);
    if (parsedLines.some((line) => line === null)) {
      issues.push(`Feature ${featureIndex + 1}: coordinates are malformed or unbounded`);
      return;
    }
    const lines = parsedLines as PilotCoordinate[][];
    const newCoordinates = lines.reduce((sum, line) => sum + line.length, 0);
    if (coordinateCount + newCoordinates > PILOT_GEOJSON_MAX_COORDINATES) {
      coordinateLimitExceeded = true;
      issues.push(`Feature ${featureIndex + 1}: cumulative coordinate limit exceeded`);
      return;
    }

    const conditionGrade = finiteNumber(properties.condition_grade, 1, 5);
    const weightLimitT = finiteNumber(properties.weight_limit_t, 0.1, 200);
    const label = boundedText(properties.name ?? properties.road_name, baseId, 120);
    const staged: PilotRoadSegment[] = [];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const id = lines.length === 1 ? baseId : `${baseId}:${lineIndex + 1}`;
      if (ids.has(id)) {
        issues.push(`Feature ${featureIndex + 1}: duplicate segment identity ${id}`);
        return;
      }
      const coordinates = lines[lineIndex];
      const fromNodeId = endpointId(coordinates[0]);
      const toNodeId = endpointId(coordinates.at(-1)!);
      if (fromNodeId === toNodeId) {
        issues.push(`Feature ${featureIndex + 1}: segment endpoints collapse under ${PILOT_ENDPOINT_PRECISION}-decimal snapping`);
        return;
      }
      staged.push({
        id,
        parentFeatureId: baseId,
        label,
        coordinates,
        fromNodeId,
        toNodeId,
        conditionGrade,
        weightLimitT,
        authorityStatus: sourceMode === "bundled_demo" ? "declared" : "unverified",
      });
    }
    staged.forEach((segment) => {
      ids.add(segment.id);
      segments.push(segment);
    });
    coordinateCount += newCoordinates;
    acceptedFeatures += 1;
  });

  if (coordinateLimitExceeded || coordinateCount > PILOT_GEOJSON_MAX_COORDINATES) {
    return { ok: false, code: "coordinate_limit", message: `Coordinate count exceeds ${PILOT_GEOJSON_MAX_COORDINATES}.`, issues };
  }
  if (segments.length === 0) return { ok: false, code: "no_usable_segments", message: "No usable road segments remain after validation.", issues };

  const nodeMap = new Map<string, { longitude: number; latitude: number; degree: number }>();
  for (const segment of segments) {
    const endpoints: Array<[string, PilotCoordinate]> = [
      [segment.fromNodeId, segment.coordinates[0]],
      [segment.toNodeId, segment.coordinates.at(-1)!],
    ];
    for (const [id, coordinate] of endpoints) {
      const current = nodeMap.get(id);
      if (current) current.degree += 1;
      else nodeMap.set(id, { longitude: coordinate[0], latitude: coordinate[1], degree: 1 });
    }
  }
  const nodes = [...nodeMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([id, node]) => ({ ...node, id, componentId: -1 }));
  const allCoordinates = segments.flatMap((segment) => segment.coordinates);
  const longitudes = allCoordinates.map((coordinate) => coordinate[0]);
  const latitudes = allCoordinates.map((coordinate) => coordinate[1]);
  const network: PilotGeoJsonNetwork = {
    policyVersion: PILOT_GEOJSON_POLICY_VERSION,
    ...metadata,
    sourceMode,
    authorityStatus: sourceMode === "bundled_demo" ? "synthetic_demo" : "unverified_local_file",
    inputFeatures: value.features.length,
    acceptedFeatures,
    rejectedFeatures: value.features.length - acceptedFeatures,
    coordinateCount,
    segments,
    nodes,
    bounds: {
      south: Math.min(...latitudes),
      west: Math.min(...longitudes),
      north: Math.max(...latitudes),
      east: Math.max(...longitudes),
    },
    issues: issues.slice(0, 100),
    fingerprint: fingerprint(JSON.stringify(stableNetworkInput(segments))),
  };
  return { ok: true, network };
}

export function analyzePilotNetwork(input: PilotGeoJsonNetwork): PilotNetworkAnalysis {
  const nodes = input.nodes.map((node) => ({ ...node }));
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const adjacency = nodes.map(() => [] as Array<{ edgeIndex: number; to: number }>);
  input.segments.forEach((segment, edgeIndex) => {
    const from = nodeIndex.get(segment.fromNodeId);
    const to = nodeIndex.get(segment.toNodeId);
    if (from === undefined || to === undefined) throw new Error("Normalized segment references an unknown endpoint");
    adjacency[from].push({ edgeIndex, to });
    adjacency[to].push({ edgeIndex, to: from });
  });

  const componentSizes: number[] = [];
  const visitedComponents = new Uint8Array(nodes.length);
  for (let start = 0; start < nodes.length; start += 1) {
    if (visitedComponents[start]) continue;
    const componentId = componentSizes.length;
    const stack = [start];
    visitedComponents[start] = 1;
    let size = 0;
    while (stack.length) {
      const current = stack.pop()!;
      nodes[current].componentId = componentId;
      size += 1;
      for (const next of adjacency[current]) {
        if (!visitedComponents[next.to]) {
          visitedComponents[next.to] = 1;
          stack.push(next.to);
        }
      }
    }
    componentSizes.push(size);
  }

  const discovery = new Int32Array(nodes.length);
  discovery.fill(-1);
  const low = new Int32Array(nodes.length);
  const subtreeSize = new Int32Array(nodes.length);
  const parentNode = new Int32Array(nodes.length);
  parentNode.fill(-1);
  const parentEdge = new Int32Array(nodes.length);
  parentEdge.fill(-1);
  const childCount = new Int32Array(nodes.length);
  const articulation = new Set<number>();
  const bridges: Array<{ edgeIndex: number; exposedNodeCount: number; componentNodeCount: number }> = [];
  let time = 0;
  let adjacencyTraversals = 0;

  // Iterative DFS avoids call-stack exhaustion on long rural chains while
  // preserving Tarjan's O(V + E) bridge and articulation guarantees.
  for (let root = 0; root < nodes.length; root += 1) {
    if (discovery[root] !== -1) continue;
    discovery[root] = time;
    low[root] = time;
    time += 1;
    subtreeSize[root] = 1;
    const stack: Array<{ node: number; nextAdjacency: number }> = [{ node: root, nextAdjacency: 0 }];

    while (stack.length) {
      const frame = stack.at(-1)!;
      const connections = adjacency[frame.node];
      if (frame.nextAdjacency < connections.length) {
        const next = connections[frame.nextAdjacency];
        frame.nextAdjacency += 1;
        adjacencyTraversals += 1;
        if (next.edgeIndex === parentEdge[frame.node]) continue;
        if (discovery[next.to] === -1) {
          parentNode[next.to] = frame.node;
          parentEdge[next.to] = next.edgeIndex;
          childCount[frame.node] += 1;
          discovery[next.to] = time;
          low[next.to] = time;
          time += 1;
          subtreeSize[next.to] = 1;
          stack.push({ node: next.to, nextAdjacency: 0 });
        } else {
          low[frame.node] = Math.min(low[frame.node], discovery[next.to]);
        }
        continue;
      }

      stack.pop();
      const parent = parentNode[frame.node];
      if (parent === -1) {
        if (childCount[frame.node] > 1) articulation.add(frame.node);
        continue;
      }
      subtreeSize[parent] += subtreeSize[frame.node];
      low[parent] = Math.min(low[parent], low[frame.node]);
      if (low[frame.node] > discovery[parent]) {
        const componentNodeCount = componentSizes[nodes[frame.node].componentId];
        bridges.push({
          edgeIndex: parentEdge[frame.node],
          exposedNodeCount: Math.min(subtreeSize[frame.node], componentNodeCount - subtreeSize[frame.node]),
          componentNodeCount,
        });
      }
      if (parentNode[parent] !== -1 && low[frame.node] >= discovery[parent]) articulation.add(parent);
    }
  }
  const bridgeSegments = bridges.map((bridge) => {
    const segment = input.segments[bridge.edgeIndex];
    const conditionMultiplier = segment.conditionGrade === null ? 1 : 1 + (segment.conditionGrade - 1) * 0.25;
    return {
      rank: 0,
      segment,
      exposedNodeCount: bridge.exposedNodeCount,
      componentNodeCount: bridge.componentNodeCount,
      riskScore: Number((bridge.exposedNodeCount * conditionMultiplier).toFixed(2)),
    };
  }).sort((left, right) => right.riskScore - left.riskScore || right.exposedNodeCount - left.exposedNodeCount || left.segment.id.localeCompare(right.segment.id))
    .map((bridge, index) => ({ ...bridge, rank: index + 1 }));
  const completeMetadata = input.segments.reduce((sum, segment) => sum + Number(segment.conditionGrade !== null) + Number(segment.weightLimitT !== null), 0);
  const metadataCompletenessPercent = input.segments.length
    ? Number(((completeMetadata / (input.segments.length * 2)) * 100).toFixed(1))
    : 0;
  const tabletopMode = input.rejectedFeatures === 0 && input.regionId !== "unscoped-local-import" && input.license !== "license-not-declared"
    ? "ready"
    : "review_required";

  return {
    network: { ...input, nodes },
    connectedComponents: componentSizes.length,
    largestComponentNodes: Math.max(...componentSizes),
    bridgeSegments,
    articulationNodeIds: [...articulation].map((index) => nodes[index].id).sort(),
    isolatedNodeCount: nodes.filter((node) => node.degree === 0).length,
    metadataCompletenessPercent,
    fieldDecisionGate: "blocked",
    tabletopMode,
    evidence: {
      algorithm: "Iterative Tarjan low-link + deterministic bridge-risk ranking",
      complexity: "O(V + E + B log B)",
      nodeVisits: nodes.length,
      adjacencyTraversals,
      endpointSnapPrecision: PILOT_ENDPOINT_PRECISION,
      allSegmentsEvaluated: input.segments.length,
    },
  };
}

export async function buildPilotNetworkEvidence(analysis: PilotNetworkAnalysis) {
  const result = {
    policyVersion: PILOT_GEOJSON_POLICY_VERSION,
    source: {
      label: analysis.network.sourceLabel,
      mode: analysis.network.sourceMode,
      regionId: analysis.network.regionId,
      license: analysis.network.license,
      observedAt: analysis.network.observedAt,
      authorityStatus: analysis.network.authorityStatus,
      fingerprint: analysis.network.fingerprint,
    },
    topology: {
      nodes: analysis.network.nodes.length,
      segments: analysis.network.segments.length,
      connectedComponents: analysis.connectedComponents,
      bridgeSegments: analysis.bridgeSegments.map((bridge) => ({
        rank: bridge.rank,
        segmentId: bridge.segment.id,
        exposedNodeCount: bridge.exposedNodeCount,
        riskScore: bridge.riskScore,
      })),
      articulationNodeIds: analysis.articulationNodeIds,
    },
    quality: {
      acceptedFeatures: analysis.network.acceptedFeatures,
      rejectedFeatures: analysis.network.rejectedFeatures,
      issues: analysis.network.issues,
      metadataCompletenessPercent: analysis.metadataCompletenessPercent,
    },
    evidence: analysis.evidence,
    gates: { tabletopMode: analysis.tabletopMode, fieldDecisionGate: analysis.fieldDecisionGate },
    boundary: "Local topology analysis only; it does not authenticate the file, diagnose infrastructure, prove accessibility, or authorize road or dispatch action.",
  };
  return { ...result, evidenceDigest: `sha256:${await sha256Hex(result)}` };
}

export function buildPilotGeoJsonDemo() {
  const roadById = new Map(REGIONAL_MODEL.roads.map((road) => [road.id, road]));
  const features = Object.entries(PILOT_GEOGRAPHY.roads).map(([id, coordinates]) => {
    const road = roadById.get(id);
    return {
      type: "Feature",
      id,
      properties: {
        segment_id: id,
        name: road?.label ?? id,
        condition_grade: road?.conditionGrade ?? 3,
        weight_limit_t: road?.weightLimitT ?? 8,
      },
      geometry: {
        type: "LineString",
        coordinates: coordinates.map(([latitude, longitude]) => [longitude, latitude]),
      },
    };
  });
  const syntheticSpurs = [
    { id: "remote-hamlet-spur", name: "Remote hamlet access · synthetic", from: [137.06397, 35.81662], to: [137.082, 35.827], condition: 4 },
    { id: "west-hamlet-spur", name: "West hamlet access · synthetic", from: [136.95991, 35.78395], to: [136.946, 35.795], condition: 3 },
    { id: "south-hamlet-spur", name: "South hamlet access · synthetic", from: [136.99087, 35.70155], to: [136.982, 35.688], condition: 5 },
  ].map((spur) => ({
    type: "Feature",
    id: spur.id,
    properties: { segment_id: spur.id, name: spur.name, condition_grade: spur.condition, weight_limit_t: 4 },
    geometry: { type: "LineString", coordinates: [spur.from, spur.to] },
  }));
  return {
    type: "FeatureCollection",
    name: "Gujo tabletop road fixture",
    lifeline: {
      sourceLabel: "Gujo OSM-derived geometry + three synthetic access spurs",
      regionId: "jp-gifu-gujo-tabletop",
      license: "OpenStreetMap ODbL geometry attribution + synthetic operational attributes",
      observedAt: "2026-07-19T00:00:00.000Z",
    },
    features: [...features, ...syntheticSpurs],
  };
}
