import {
  planRegionalDelivery,
  type RegionalModel,
  validateScalableRegionalModel,
} from "../../../lib/regional";

export const REGIONAL_PLAN_SCHEMA_VERSION = "2026-07-19";
const ENGINE_VERSION = "regional-access-2026.07.2";
const MAX_BODY_BYTES = 1_000_000;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasString(record: JsonRecord, key: string) {
  return typeof record[key] === "string";
}

function hasFiniteNumber(record: JsonRecord, key: string) {
  return typeof record[key] === "number" && Number.isFinite(record[key]);
}

function hasOnlyKeys(record: JsonRecord, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isRegionalModelShape(value: unknown): value is RegionalModel {
  if (!isRecord(value) || !hasString(value, "district") || !hasOnlyKeys(value, ["district", "nodes", "roads", "demands", "vehicles"])) return false;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.roads) || !Array.isArray(value.demands) || !Array.isArray(value.vehicles)) return false;
  const nodesValid = value.nodes.every((item) => isRecord(item)
    && hasOnlyKeys(item, ["id", "label", "kind", "x", "y"])
    && hasString(item, "id") && hasString(item, "label") && hasString(item, "kind")
    && hasFiniteNumber(item, "x") && hasFiniteNumber(item, "y"));
  const roadsValid = value.roads.every((item) => isRecord(item)
    && hasOnlyKeys(item, ["id", "label", "from", "to", "distanceKm", "travelMinutes", "conditionGrade", "annualFailureProbability", "repairCostM", "weightLimitT"])
    && hasString(item, "id") && hasString(item, "label") && hasString(item, "from") && hasString(item, "to")
    && hasFiniteNumber(item, "distanceKm") && hasFiniteNumber(item, "travelMinutes")
    && hasFiniteNumber(item, "conditionGrade") && hasFiniteNumber(item, "annualFailureProbability")
    && hasFiniteNumber(item, "repairCostM") && hasFiniteNumber(item, "weightLimitT"));
  const demandsValid = value.demands.every((item) => isRecord(item)
    && hasOnlyKeys(item, ["id", "nodeId", "label", "households", "vulnerableResidents", "parcels", "coldParcels", "deadlineMinutes", "priority"])
    && hasString(item, "id") && hasString(item, "nodeId") && hasString(item, "label") && hasString(item, "priority")
    && hasFiniteNumber(item, "households") && hasFiniteNumber(item, "vulnerableResidents")
    && hasFiniteNumber(item, "parcels") && hasFiniteNumber(item, "coldParcels")
    && hasFiniteNumber(item, "deadlineMinutes"));
  const vehiclesValid = value.vehicles.every((item) => isRecord(item)
    && hasOnlyKeys(item, ["id", "label", "operator", "depotNodeId", "capacityParcels", "coldCapacity", "shiftMinutes", "weightT", "emissionsKgPerKm", "color"])
    && hasString(item, "id") && hasString(item, "label") && hasString(item, "operator")
    && hasString(item, "depotNodeId") && hasString(item, "color")
    && hasFiniteNumber(item, "capacityParcels") && hasFiniteNumber(item, "coldCapacity")
    && hasFiniteNumber(item, "shiftMinutes") && hasFiniteNumber(item, "weightT")
    && hasFiniteNumber(item, "emissionsKgPerKm"));
  return nodesValid && roadsValid && demandsValid && vehiclesValid;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "request_too_large", maxBytes: MAX_BODY_BYTES }, 413);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "request_unreadable" }, 400);
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "request_too_large", maxBytes: MAX_BODY_BYTES }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!isRecord(body)
    || !hasOnlyKeys(body, ["schemaVersion", "model", "closedRoadIds"])
    || body.schemaVersion !== REGIONAL_PLAN_SCHEMA_VERSION
    || !isRegionalModelShape(body.model)) {
    return json({
      error: "invalid_request_schema",
      expectedSchemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
    }, 422);
  }
  const closedRoadIds = body.closedRoadIds ?? [];
  if (!Array.isArray(closedRoadIds) || closedRoadIds.length > 50 || !closedRoadIds.every((id) => typeof id === "string")) {
    return json({ error: "invalid_closed_road_ids" }, 422);
  }
  const validation = validateScalableRegionalModel(body.model);
  if (!validation.valid) return json({ error: "invalid_model", details: validation.errors }, 422);

  try {
    const normalizedRequest = {
      schemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
      model: body.model,
      closedRoadIds: [...new Set(closedRoadIds)].sort(),
    };
    const inputDigest = await sha256(normalizedRequest);
    const plan = planRegionalDelivery(body.model, normalizedRequest.closedRoadIds);
    return json({
      schemaVersion: REGIONAL_PLAN_SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      requestId: `rg-${inputDigest.slice(0, 16)}`,
      inputDigest: `sha256:${inputDigest}`,
      advisoryOnly: true,
      plan,
      constraintEvidence: plan.routes.map((route) => ({
        vehicleId: route.vehicle.id,
        parcels: { used: route.parcels, limit: route.vehicle.capacityParcels, pass: route.parcels <= route.vehicle.capacityParcels },
        coldChain: { used: route.coldParcels, limit: route.vehicle.coldCapacity, pass: route.coldParcels <= route.vehicle.coldCapacity },
        shiftMinutes: { used: route.totalMinutes, limit: route.vehicle.shiftMinutes, pass: route.totalMinutes <= route.vehicle.shiftMinutes },
        deadlines: { lateDemandIds: route.stops.filter((stop) => !stop.onTime).map((stop) => stop.demandId) },
        roadSegmentIds: route.usedRoadSegmentIds,
      })),
      warnings: [
        "Advisory planning result only; it does not diagnose, close, or certify a road.",
        plan.optimalityCertified
          ? "Optimality is certified only for the submitted bounded exact model and objective."
          : "This is a deterministic feasible heuristic result; no optimality bound is claimed.",
      ],
    });
  } catch (error) {
    return json({
      error: "planning_failed",
      message: error instanceof Error ? error.message : "Unknown planning error",
    }, 422);
  }
}
