export type ScaleNodeCount = 512 | 2048;

export interface ScaleNode {
  id: string;
  cluster: number;
  latitude: number;
  longitude: number;
  households: number;
  vulnerableResidents: number;
  kind: "hub" | "community" | "clinic";
}

export interface ScaleEdge {
  id: string;
  from: number;
  to: number;
  distanceKm: number;
  travelMinutes: number;
  conditionGrade: 1 | 2 | 3 | 4 | 5;
  annualFailureProbability: number;
  repairCostM: number;
  corridor: boolean;
}

export interface ScaleNetwork {
  region: string;
  nodes: ScaleNode[];
  edges: ScaleEdge[];
  hubNodeIndexes: number[];
  adjacency: number[][];
  fingerprint: string;
}

export interface ScaleAccessMetrics {
  householdCoveragePercent: number;
  vulnerableCoveragePercent: number;
  householdsCovered: number;
  vulnerableResidentsCovered: number;
  isolatedHouseholds: number;
  p95AccessMinutes: number;
  meanAccessMinutes: number;
}

export interface ScaleCorridorImpact {
  edge: ScaleEdge;
  metrics: ScaleAccessMetrics;
  householdCoverageDelta: number;
  vulnerableCoverageDelta: number;
  householdsLost: number;
  vulnerableResidentsLost: number;
  averageAddedMinutes: number;
  affectedNodeIds: string[];
  score: number;
}

export interface RegionalScaleProof {
  network: ScaleNetwork;
  baseline: ScaleAccessMetrics;
  rankedCorridors: ScaleCorridorImpact[];
  evidence: {
    algorithm: "Sparse multi-source Dijkstra + flow screening + exact top-corridor failure replay";
    edgesScreened: number;
    exactFailuresEvaluated: number;
    dijkstraRuns: number;
    graphRelaxations: number;
    accessThresholdMinutes: number;
    deterministic: true;
  };
}

const CLUSTER_ANCHORS = [
  [35.742, 136.944],
  [35.786, 136.961],
  [35.806, 136.997],
  [35.773, 137.034],
  [35.715, 137.055],
  [35.816, 137.064],
  [35.702, 136.991],
  [35.754, 136.987],
] as const;

const HUB_CLUSTERS = new Set([0, 2, 4]);
const ACCESS_THRESHOLD_MINUTES = 90;
const EXACT_FAILURE_LIMIT = 64;

function mix32(value: number) {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d);
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b);
  result ^= result >>> 16;
  return result >>> 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function haversineKm(left: Pick<ScaleNode, "latitude" | "longitude">, right: Pick<ScaleNode, "latitude" | "longitude">) {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = (right.longitude - left.longitude) * radians;
  const latitude1 = left.latitude * radians;
  const latitude2 = right.latitude * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fingerprintNetwork(nodes: ScaleNode[], edges: ScaleEdge[]) {
  let hash = 0x811c9dc5;
  const update = (value: number) => {
    hash ^= value >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  };
  update(nodes.length);
  update(edges.length);
  for (let index = 0; index < nodes.length; index += Math.max(1, Math.floor(nodes.length / 64))) {
    const node = nodes[index];
    update(Math.round(node.latitude * 100_000));
    update(Math.round(node.longitude * 100_000));
    update(node.households);
  }
  for (let index = 0; index < edges.length; index += Math.max(1, Math.floor(edges.length / 64))) {
    const edge = edges[index];
    update(edge.from);
    update(edge.to);
    update(Math.round(edge.travelMinutes * 100));
  }
  return `fnv1a:${hash.toString(16).padStart(8, "0")}`;
}

export function buildScaleNetwork(nodeCount: ScaleNodeCount): ScaleNetwork {
  const nodes: ScaleNode[] = [];
  const clusterSize = Math.ceil(nodeCount / CLUSTER_ANCHORS.length);
  for (let index = 0; index < nodeCount; index += 1) {
    const cluster = index % CLUSTER_ANCHORS.length;
    const localIndex = Math.floor(index / CLUSTER_ANCHORS.length);
    const seed = mix32(index + nodeCount * 17);
    const angle = localIndex * 2.3999632297 + cluster * 0.73;
    const radius = 0.0018 + Math.sqrt((localIndex + 1) / clusterSize) * (0.020 + cluster % 3 * 0.004);
    const [anchorLatitude, anchorLongitude] = CLUSTER_ANCHORS[cluster];
    const latitude = anchorLatitude + Math.sin(angle) * radius * 0.72 + ((seed & 255) - 127) * 0.000004;
    const longitude = anchorLongitude + Math.cos(angle) * radius * 1.08 + (((seed >>> 8) & 255) - 127) * 0.000004;
    const households = 12 + seed % 89;
    const vulnerableResidents = Math.max(2, Math.round(households * (0.12 + ((seed >>> 16) % 23) / 100)));
    const root = localIndex === 0;
    nodes.push({
      id: `zone-${String(index + 1).padStart(4, "0")}`,
      cluster,
      latitude: round(latitude, 6),
      longitude: round(longitude, 6),
      households,
      vulnerableResidents,
      kind: root && HUB_CLUSTERS.has(cluster) ? "hub" : root && cluster === 7 ? "clinic" : "community",
    });
  }

  const edges: ScaleEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (from: number, to: number, corridor = false) => {
    if (from === to || from < 0 || to < 0 || from >= nodes.length || to >= nodes.length) return;
    const lower = Math.min(from, to);
    const upper = Math.max(from, to);
    const key = `${lower}:${upper}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const seed = mix32(lower * 65_537 + upper * 257 + nodeCount);
    const directDistance = haversineKm(nodes[lower], nodes[upper]);
    const distanceKm = Math.max(0.2, directDistance * (1.14 + (seed % 22) / 100));
    const conditionGrade = (1 + seed % 5) as ScaleEdge["conditionGrade"];
    edges.push({
      id: `link-${lower}-${upper}`,
      from: lower,
      to: upper,
      distanceKm: round(distanceKm, 2),
      travelMinutes: round(distanceKm / (corridor ? 42 : 31) * 60, 2),
      conditionGrade,
      annualFailureProbability: round(0.012 + conditionGrade * 0.022 + ((seed >>> 8) % 70) / 1000, 3),
      repairCostM: 18 + conditionGrade * 14 + (seed >>> 16) % 58,
      corridor,
    });
  };

  const clusterIndexes = Array.from({ length: CLUSTER_ANCHORS.length }, () => [] as number[]);
  nodes.forEach((node, index) => clusterIndexes[node.cluster].push(index));
  for (const indexes of clusterIndexes) {
    for (let localIndex = 1; localIndex < indexes.length; localIndex += 1) {
      addEdge(indexes[localIndex], indexes[localIndex - 1]);
      addEdge(indexes[localIndex], indexes[Math.floor((localIndex - 1) / 2)]);
      if (localIndex >= 4 && localIndex % 2 === 0) addEdge(indexes[localIndex], indexes[localIndex - 3]);
      if (localIndex >= 9 && localIndex % 5 === 0) addEdge(indexes[localIndex], indexes[localIndex - 7]);
    }
  }

  const roots = clusterIndexes.map((indexes) => indexes[0]);
  for (const [fromCluster, toCluster] of [[0,1],[1,2],[2,3],[3,4],[4,0],[2,5],[3,6],[4,7],[6,7]] as const) {
    addEdge(roots[fromCluster], roots[toCluster], true);
  }

  const adjacency = Array.from({ length: nodes.length }, () => [] as number[]);
  edges.forEach((edge, edgeIndex) => {
    adjacency[edge.from].push(edgeIndex);
    adjacency[edge.to].push(edgeIndex);
  });
  const hubNodeIndexes = nodes.flatMap((node, index) => node.kind === "hub" ? [index] : []);
  return {
    region: "Gujo regional scale proof · synthetic operational mesh",
    nodes,
    edges,
    hubNodeIndexes,
    adjacency,
    fingerprint: fingerprintNetwork(nodes, edges),
  };
}

interface DijkstraResult {
  distance: Float64Array;
  predecessorNode: Int32Array;
  predecessorEdge: Int32Array;
  relaxations: number;
}

function multiSourceDijkstra(network: ScaleNetwork, blockedEdgeIndex = -1): DijkstraResult {
  const distance = new Float64Array(network.nodes.length);
  distance.fill(Number.POSITIVE_INFINITY);
  const predecessorNode = new Int32Array(network.nodes.length);
  const predecessorEdge = new Int32Array(network.nodes.length);
  predecessorNode.fill(-1);
  predecessorEdge.fill(-1);
  const heap: Array<{ node: number; cost: number }> = [];
  const push = (item: { node: number; cost: number }) => {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent].cost <= heap[index].cost) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      index = parent;
    }
  };
  const pop = () => {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last) {
      heap[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < heap.length && heap[left].cost < heap[smallest].cost) smallest = left;
        if (right < heap.length && heap[right].cost < heap[smallest].cost) smallest = right;
        if (smallest === index) break;
        [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
        index = smallest;
      }
    }
    return first;
  };

  for (const hubIndex of network.hubNodeIndexes) {
    distance[hubIndex] = 0;
    push({ node: hubIndex, cost: 0 });
  }
  let relaxations = 0;
  while (heap.length > 0) {
    const current = pop();
    if (!current || current.cost !== distance[current.node]) continue;
    for (const edgeIndex of network.adjacency[current.node]) {
      if (edgeIndex === blockedEdgeIndex) continue;
      const edge = network.edges[edgeIndex];
      const next = edge.from === current.node ? edge.to : edge.from;
      const nextCost = current.cost + edge.travelMinutes;
      relaxations += 1;
      if (nextCost >= distance[next]) continue;
      distance[next] = nextCost;
      predecessorNode[next] = current.node;
      predecessorEdge[next] = edgeIndex;
      push({ node: next, cost: nextCost });
    }
  }
  return { distance, predecessorNode, predecessorEdge, relaxations };
}

function metricsForDistance(network: ScaleNetwork, distance: Float64Array): ScaleAccessMetrics {
  const totalHouseholds = network.nodes.reduce((sum, node) => sum + node.households, 0);
  const totalVulnerable = network.nodes.reduce((sum, node) => sum + node.vulnerableResidents, 0);
  let householdsCovered = 0;
  let vulnerableResidentsCovered = 0;
  let isolatedHouseholds = 0;
  let weightedMinutes = 0;
  let finiteHouseholds = 0;
  const finiteMinutes: number[] = [];
  network.nodes.forEach((node, index) => {
    const minutes = distance[index];
    if (!Number.isFinite(minutes)) {
      isolatedHouseholds += node.households;
      return;
    }
    finiteMinutes.push(minutes);
    weightedMinutes += minutes * node.households;
    finiteHouseholds += node.households;
    if (minutes <= ACCESS_THRESHOLD_MINUTES) {
      householdsCovered += node.households;
      vulnerableResidentsCovered += node.vulnerableResidents;
    }
  });
  finiteMinutes.sort((left, right) => left - right);
  const p95Index = Math.min(finiteMinutes.length - 1, Math.floor(finiteMinutes.length * 0.95));
  return {
    householdCoveragePercent: round(householdsCovered / totalHouseholds * 100, 1),
    vulnerableCoveragePercent: round(vulnerableResidentsCovered / totalVulnerable * 100, 1),
    householdsCovered,
    vulnerableResidentsCovered,
    isolatedHouseholds,
    p95AccessMinutes: round(finiteMinutes[Math.max(0, p95Index)] ?? 0, 1),
    meanAccessMinutes: round(weightedMinutes / Math.max(1, finiteHouseholds), 1),
  };
}

function corridorImpact(
  network: ScaleNetwork,
  edgeIndex: number,
  baselineRun: DijkstraResult,
  baselineMetrics: ScaleAccessMetrics,
) {
  const disruptedRun = multiSourceDijkstra(network, edgeIndex);
  const metrics = metricsForDistance(network, disruptedRun.distance);
  let weightedAddedMinutes = 0;
  let weightedAffectedHouseholds = 0;
  const affectedNodeIds: string[] = [];
  network.nodes.forEach((node, nodeIndex) => {
    const before = baselineRun.distance[nodeIndex];
    const after = disruptedRun.distance[nodeIndex];
    const added = Number.isFinite(after) && Number.isFinite(before) ? Math.max(0, after - before) : Number.POSITIVE_INFINITY;
    const crossedAccessFloor = before <= ACCESS_THRESHOLD_MINUTES && after > ACCESS_THRESHOLD_MINUTES;
    if (crossedAccessFloor || added > 5 || !Number.isFinite(after)) {
      affectedNodeIds.push(node.id);
      weightedAffectedHouseholds += node.households;
      weightedAddedMinutes += (Number.isFinite(added) ? added : ACCESS_THRESHOLD_MINUTES) * node.households;
    }
  });
  const householdsLost = baselineMetrics.householdsCovered - metrics.householdsCovered;
  const vulnerableResidentsLost = baselineMetrics.vulnerableResidentsCovered - metrics.vulnerableResidentsCovered;
  const averageAddedMinutes = round(weightedAddedMinutes / Math.max(1, weightedAffectedHouseholds), 1);
  const edge = network.edges[edgeIndex];
  return {
    impact: {
      edge,
      metrics,
      householdCoverageDelta: round(metrics.householdCoveragePercent - baselineMetrics.householdCoveragePercent, 1),
      vulnerableCoverageDelta: round(metrics.vulnerableCoveragePercent - baselineMetrics.vulnerableCoveragePercent, 1),
      householdsLost,
      vulnerableResidentsLost,
      averageAddedMinutes,
      affectedNodeIds,
      score: round(
        vulnerableResidentsLost * 100
        + householdsLost * 5
        + metrics.isolatedHouseholds * 2
        + averageAddedMinutes * 12
        + edge.annualFailureProbability * 1_000,
        2,
      ),
    } satisfies ScaleCorridorImpact,
    relaxations: disruptedRun.relaxations,
  };
}

export function buildRegionalScaleProof(nodeCount: ScaleNodeCount): RegionalScaleProof {
  const network = buildScaleNetwork(nodeCount);
  const baselineRun = multiSourceDijkstra(network);
  const baseline = metricsForDistance(network, baselineRun.distance);
  const accumulatedFlow = new Float64Array(network.nodes.length);
  const edgeFlow = new Float64Array(network.edges.length);
  network.nodes.forEach((node, index) => { accumulatedFlow[index] = node.households + node.vulnerableResidents * 2; });
  const orderedNodes = Array.from({ length: network.nodes.length }, (_, index) => index)
    .filter((index) => Number.isFinite(baselineRun.distance[index]))
    .sort((left, right) => baselineRun.distance[right] - baselineRun.distance[left]);
  for (const nodeIndex of orderedNodes) {
    const edgeIndex = baselineRun.predecessorEdge[nodeIndex];
    const parentIndex = baselineRun.predecessorNode[nodeIndex];
    if (edgeIndex < 0 || parentIndex < 0) continue;
    edgeFlow[edgeIndex] += accumulatedFlow[nodeIndex];
    accumulatedFlow[parentIndex] += accumulatedFlow[nodeIndex];
  }

  const candidateIndexes = network.edges
    .map((edge, edgeIndex) => ({
      edgeIndex,
      screenScore: edgeFlow[edgeIndex] * (edge.annualFailureProbability + 0.02) * edge.conditionGrade * (edge.corridor ? 1.4 : 1),
    }))
    .sort((left, right) => right.screenScore - left.screenScore || left.edgeIndex - right.edgeIndex)
    .slice(0, Math.min(EXACT_FAILURE_LIMIT, network.edges.length))
    .map((item) => item.edgeIndex);

  let graphRelaxations = baselineRun.relaxations;
  const impacts = candidateIndexes.map((edgeIndex) => {
    const result = corridorImpact(network, edgeIndex, baselineRun, baseline);
    graphRelaxations += result.relaxations;
    return result.impact;
  });
  impacts.sort((left, right) => right.score - left.score || left.edge.id.localeCompare(right.edge.id));
  return {
    network,
    baseline,
    rankedCorridors: impacts.slice(0, 8),
    evidence: {
      algorithm: "Sparse multi-source Dijkstra + flow screening + exact top-corridor failure replay",
      edgesScreened: network.edges.length,
      exactFailuresEvaluated: candidateIndexes.length,
      dijkstraRuns: 1 + candidateIndexes.length,
      graphRelaxations,
      accessThresholdMinutes: ACCESS_THRESHOLD_MINUTES,
      deterministic: true,
    },
  };
}
