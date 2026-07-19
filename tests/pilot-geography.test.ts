import test from "node:test";
import assert from "node:assert/strict";
import { REGIONAL_MODEL } from "../lib/regional.ts";
import { coordinateForNode, geometryForRoad, PILOT_GEOGRAPHY } from "../lib/pilot-geography.ts";

test("the real-basemap pilot covers every modeled node and road", () => {
  for (const node of REGIONAL_MODEL.nodes) {
    const [latitude, longitude] = coordinateForNode(node);
    assert.ok(latitude >= 35 && latitude <= 36, `${node.id} latitude must remain in the declared Gifu pilot area`);
    assert.ok(longitude >= 136 && longitude <= 138, `${node.id} longitude must remain in the declared Gifu pilot area`);
  }

  for (const road of REGIONAL_MODEL.roads) {
    const geometry = geometryForRoad(road, REGIONAL_MODEL.nodes);
    assert.ok(geometry.length >= 2, `${road.id} must have a visible road geometry`);
    for (const [latitude, longitude] of geometry) {
      assert.ok(Number.isFinite(latitude) && Number.isFinite(longitude));
      assert.ok(latitude >= 35 && latitude <= 36);
      assert.ok(longitude >= 136 && longitude <= 138);
    }
  }
});

test("the pilot disclosure separates real geography from synthetic operations", () => {
  assert.match(PILOT_GEOGRAPHY.label, /real basemap/i);
  assert.match(PILOT_GEOGRAPHY.disclosure, /synthetic facilities/i);
  assert.match(PILOT_GEOGRAPHY.disclosure, /road state/i);
});
