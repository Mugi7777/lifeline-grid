import assert from "node:assert/strict";
import test from "node:test";
import {
  PILOT_GEOJSON_MAX_FEATURES,
  analyzePilotNetwork,
  buildPilotGeoJsonDemo,
  buildPilotNetworkEvidence,
  parsePilotGeoJson,
} from "../lib/pilot-data-sandbox.ts";

function feature(id: string, from: [number, number], to: [number, number], properties: Record<string, unknown> = {}) {
  return {
    type: "Feature",
    id,
    properties: { segment_id: id, condition_grade: 3, weight_limit_t: 8, ...properties },
    geometry: { type: "LineString", coordinates: [from, to] },
  };
}

function collection(features: unknown[], lifeline?: Record<string, unknown>) {
  return { type: "FeatureCollection", features, ...(lifeline ? { lifeline } : {}) };
}

test("the bundled Gujo fixture produces exact topology evidence", () => {
  const parsed = parsePilotGeoJson(buildPilotGeoJsonDemo(), "bundled_demo");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const analysis = analyzePilotNetwork(parsed.network);
  assert.equal(parsed.network.inputFeatures, 15);
  assert.equal(parsed.network.segments.length, 15);
  assert.equal(parsed.network.nodes.length, 11);
  assert.equal(parsed.network.coordinateCount, 174);
  assert.equal(parsed.network.fingerprint, "fnv1a:8694dc00");
  assert.equal(analysis.connectedComponents, 1);
  assert.deepEqual(analysis.bridgeSegments.map((bridge) => bridge.segment.id), [
    "south-hamlet-spur",
    "remote-hamlet-spur",
    "west-hamlet-spur",
  ]);
  assert.equal(analysis.articulationNodeIds.length, 3);
  assert.equal(analysis.metadataCompletenessPercent, 100);
  assert.equal(analysis.evidence.nodeVisits, 11);
  assert.equal(analysis.evidence.adjacencyTraversals, 30);
  assert.equal(analysis.tabletopMode, "ready");
  assert.equal(analysis.fieldDecisionGate, "blocked");
});

test("Tarjan analysis distinguishes a chain, a cycle and parallel roads", () => {
  const chain = parsePilotGeoJson(collection([
    feature("a-b", [137, 35], [137.01, 35]),
    feature("b-c", [137.01, 35], [137.02, 35]),
  ]));
  assert.equal(chain.ok, true);
  if (!chain.ok) return;
  assert.equal(analyzePilotNetwork(chain.network).bridgeSegments.length, 2);

  const cycle = parsePilotGeoJson(collection([
    feature("a-b", [137, 35], [137.01, 35]),
    feature("b-c", [137.01, 35], [137.005, 35.01]),
    feature("c-a", [137.005, 35.01], [137, 35]),
  ]));
  assert.equal(cycle.ok, true);
  if (!cycle.ok) return;
  assert.equal(analyzePilotNetwork(cycle.network).bridgeSegments.length, 0);

  const parallel = parsePilotGeoJson(collection([
    feature("route-1", [137, 35], [137.01, 35]),
    feature("route-2", [137, 35], [137.01, 35]),
  ]));
  assert.equal(parallel.ok, true);
  if (!parallel.ok) return;
  assert.equal(analyzePilotNetwork(parallel.network).bridgeSegments.length, 0);
});

test("iterative analysis handles the maximum bounded rural chain", () => {
  const features = Array.from({ length: PILOT_GEOJSON_MAX_FEATURES }, (_, index) => {
    const fromLongitude = 135 + index / 10_000;
    const toLongitude = 135 + (index + 1) / 10_000;
    return feature(`chain-${index}`, [fromLongitude, 35], [toLongitude, 35]);
  });
  const parsed = parsePilotGeoJson(collection(features, {
    regionId: "bounded-chain-test",
    license: "synthetic-test-data",
  }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const analysis = analyzePilotNetwork(parsed.network);
  assert.equal(parsed.network.nodes.length, PILOT_GEOJSON_MAX_FEATURES + 1);
  assert.equal(analysis.bridgeSegments.length, PILOT_GEOJSON_MAX_FEATURES);
  assert.equal(analysis.articulationNodeIds.length, PILOT_GEOJSON_MAX_FEATURES - 1);
  assert.equal(analysis.evidence.adjacencyTraversals, PILOT_GEOJSON_MAX_FEATURES * 2);
});

test("invalid features are isolated instead of poisoning accepted topology", () => {
  const parsed = parsePilotGeoJson(collection([
    feature("valid", [137, 35], [137.01, 35], { name: "<script>not executable</script>" }),
    { type: "Feature", id: "polygon", properties: { segment_id: "polygon" }, geometry: { type: "Polygon", coordinates: [] } },
    { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[137, 35], [137.02, 35]] } },
  ]));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.network.acceptedFeatures, 1);
  assert.equal(parsed.network.rejectedFeatures, 2);
  assert.equal(parsed.network.issues.length, 2);
  assert.equal(parsed.network.segments[0].label, "<script>not executable</script>");
  const analysis = analyzePilotNetwork(parsed.network);
  assert.equal(analysis.tabletopMode, "review_required");
});

test("unbounded and unusable GeoJSON fails closed", () => {
  assert.equal(parsePilotGeoJson({ type: "FeatureCollection", features: [] }).ok, false);
  const oversized = { type: "FeatureCollection", features: Array.from({ length: PILOT_GEOJSON_MAX_FEATURES + 1 }, (_, index) => feature(`s-${index}`, [137, 35], [137.01, 35])) };
  const oversizedResult = parsePilotGeoJson(oversized);
  assert.equal(oversizedResult.ok, false);
  if (!oversizedResult.ok) assert.equal(oversizedResult.code, "feature_limit");
  const noRoad = parsePilotGeoJson(collection([
    { type: "Feature", id: "point", properties: { segment_id: "point" }, geometry: { type: "Point", coordinates: [137, 35] } },
  ]));
  assert.equal(noRoad.ok, false);
  if (!noRoad.ok) assert.equal(noRoad.code, "no_usable_segments");
});

test("evidence is reproducible and binds every accepted segment", async () => {
  const firstParsed = parsePilotGeoJson(buildPilotGeoJsonDemo(), "bundled_demo");
  const secondParsed = parsePilotGeoJson(structuredClone(buildPilotGeoJsonDemo()), "bundled_demo");
  assert.equal(firstParsed.ok, true);
  assert.equal(secondParsed.ok, true);
  if (!firstParsed.ok || !secondParsed.ok) return;
  const first = await buildPilotNetworkEvidence(analyzePilotNetwork(firstParsed.network));
  const second = await buildPilotNetworkEvidence(analyzePilotNetwork(secondParsed.network));
  assert.deepEqual(first, second);
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.evidence.allSegmentsEvaluated, 15);
  assert.equal(first.gates.fieldDecisionGate, "blocked");
});
