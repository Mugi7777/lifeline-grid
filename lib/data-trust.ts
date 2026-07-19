import { canonicalJson, isRecord, sha256Hex } from "./regional-contract.ts";

export const DATA_TRUST_SCHEMA_VERSION = "2026-07-19";
export const DATA_TRUST_POLICY_ID = "regional-operations-jp-v1";
export const DATA_TRUST_DEMO_TIME = "2026-07-19T15:00:00.000Z";

export type OperationalFeedClass =
  | "map_topology"
  | "road_authority"
  | "weather"
  | "fleet_availability";

export type FeedSignatureStatus = "verified" | "unverified" | "invalid";
export type DataTrustDemoScenario = "verified" | "stale_authority" | "conflicting_weather" | "tampered_signature" | "feed_outage";

export interface OperationalDataFeed {
  id: string;
  sourceClass: OperationalFeedClass;
  label: string;
  issuer: string;
  sourceUri: string;
  regionId: string;
  observedAt: string;
  validUntil: string;
  recordCount: number;
  coveragePercent: number;
  signatureStatus: FeedSignatureStatus;
  digest: string;
  conflicts: string[];
}

export interface OperationalDataBundle {
  schemaVersion: typeof DATA_TRUST_SCHEMA_VERSION;
  bundleId: string;
  regionId: string;
  createdAt: string;
  feeds: OperationalDataFeed[];
}

export interface FeedTrustEvaluation {
  id: string;
  sourceClass: OperationalFeedClass;
  label: string;
  status: "trusted" | "review_required" | "quarantined";
  score: number;
  ageSeconds: number;
  coveragePercent: number;
  recordCount: number;
  signatureStatus: FeedSignatureStatus;
  reasons: string[];
}

export interface DataTrustEvaluation {
  schemaVersion: typeof DATA_TRUST_SCHEMA_VERSION;
  policyId: typeof DATA_TRUST_POLICY_ID;
  bundleId: string;
  regionId: string;
  evaluatedAt: string;
  planningMode: "verified" | "degraded" | "quarantined";
  decisionGate: "human_review_required" | "blocked";
  autonomousAction: "prohibited";
  trustScore: number;
  trustedFeeds: number;
  totalFeeds: number;
  recordsEvaluated: number;
  missingSourceClasses: OperationalFeedClass[];
  blockers: string[];
  nextAction: string;
  feeds: FeedTrustEvaluation[];
}

const FEED_CLASSES: OperationalFeedClass[] = ["map_topology", "road_authority", "weather", "fleet_availability"];
const SIGNATURE_STATUSES: FeedSignatureStatus[] = ["verified", "unverified", "invalid"];
const FEED_KEYS = [
  "id", "sourceClass", "label", "issuer", "sourceUri", "regionId", "observedAt", "validUntil",
  "recordCount", "coveragePercent", "signatureStatus", "digest", "conflicts",
];
const BUNDLE_KEYS = ["schemaVersion", "bundleId", "regionId", "createdAt", "feeds"];
const CLOCK_SKEW_MS = 2 * 60 * 1000;

const POLICY: Record<OperationalFeedClass, { maxAgeSeconds: number; minCoveragePercent: number }> = {
  map_topology: { maxAgeSeconds: 7 * 24 * 60 * 60, minCoveragePercent: 99.5 },
  road_authority: { maxAgeSeconds: 15 * 60, minCoveragePercent: 99.5 },
  weather: { maxAgeSeconds: 30 * 60, minCoveragePercent: 95 },
  fleet_availability: { maxAgeSeconds: 5 * 60, minCoveragePercent: 98 },
};

function hasOnlyKeys(record: Record<string, unknown>, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isBoundedText(value: unknown, min: number, max: number) {
  return typeof value === "string"
    && value.length >= min
    && value.length <= max
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function isIdentifier(value: unknown, max = 120) {
  return isBoundedText(value, 1, max) && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value as string);
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || value.length > 35 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isHttpsUrl(value: unknown) {
  if (!isBoundedText(value, 8, 500)) return false;
  try {
    const url = new URL(value as string);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseFeed(value: unknown): OperationalDataFeed | null {
  if (!isRecord(value) || !hasOnlyKeys(value, FEED_KEYS)) return null;
  if (!isIdentifier(value.id)
    || !FEED_CLASSES.includes(value.sourceClass as OperationalFeedClass)
    || !isBoundedText(value.label, 1, 120)
    || !isHttpsUrl(value.issuer)
    || !isHttpsUrl(value.sourceUri)
    || !isIdentifier(value.regionId)
    || parseTimestamp(value.observedAt) === null
    || parseTimestamp(value.validUntil) === null
    || !Number.isSafeInteger(value.recordCount)
    || (value.recordCount as number) < 0
    || (value.recordCount as number) > 10_000_000
    || typeof value.coveragePercent !== "number"
    || !Number.isFinite(value.coveragePercent)
    || value.coveragePercent < 0
    || value.coveragePercent > 100
    || !SIGNATURE_STATUSES.includes(value.signatureStatus as FeedSignatureStatus)
    || typeof value.digest !== "string"
    || !/^sha256:[a-f0-9]{64}$/.test(value.digest)
    || !Array.isArray(value.conflicts)
    || value.conflicts.length > 20
    || !value.conflicts.every((item) => isBoundedText(item, 1, 240))) return null;
  return {
    id: value.id as string,
    sourceClass: value.sourceClass as OperationalFeedClass,
    label: value.label as string,
    issuer: value.issuer as string,
    sourceUri: value.sourceUri as string,
    regionId: value.regionId as string,
    observedAt: value.observedAt as string,
    validUntil: value.validUntil as string,
    recordCount: value.recordCount as number,
    coveragePercent: value.coveragePercent,
    signatureStatus: value.signatureStatus as FeedSignatureStatus,
    digest: value.digest,
    conflicts: [...value.conflicts] as string[],
  };
}

export function parseOperationalDataBundle(value: unknown):
  | { ok: true; value: OperationalDataBundle }
  | { ok: false; error: "invalid_data_bundle"; expectedSchemaVersion: typeof DATA_TRUST_SCHEMA_VERSION } {
  const invalid = { ok: false, error: "invalid_data_bundle", expectedSchemaVersion: DATA_TRUST_SCHEMA_VERSION } as const;
  if (!isRecord(value)
    || !hasOnlyKeys(value, BUNDLE_KEYS)
    || value.schemaVersion !== DATA_TRUST_SCHEMA_VERSION
    || !isIdentifier(value.bundleId)
    || !isIdentifier(value.regionId)
    || parseTimestamp(value.createdAt) === null
    || !Array.isArray(value.feeds)
    || value.feeds.length === 0
    || value.feeds.length > 32) return invalid;
  const feeds = value.feeds.map(parseFeed);
  if (feeds.some((feed) => feed === null)) return invalid;
  const typedFeeds = feeds as OperationalDataFeed[];
  if (new Set(typedFeeds.map((feed) => feed.id)).size !== typedFeeds.length) return invalid;
  return {
    ok: true,
    value: {
      schemaVersion: DATA_TRUST_SCHEMA_VERSION,
      bundleId: value.bundleId as string,
      regionId: value.regionId as string,
      createdAt: value.createdAt as string,
      feeds: typedFeeds,
    },
  };
}

function evaluateFeed(feed: OperationalDataFeed, expectedRegionId: string, nowMs: number): FeedTrustEvaluation {
  const policy = POLICY[feed.sourceClass];
  const observedAt = Date.parse(feed.observedAt);
  const validUntil = Date.parse(feed.validUntil);
  const ageSeconds = Math.max(0, Math.round((nowMs - observedAt) / 1000));
  const reasons: string[] = [];
  let status: FeedTrustEvaluation["status"] = "trusted";
  let score = 100;
  const quarantine = (reason: string, penalty: number) => {
    reasons.push(reason);
    status = "quarantined";
    score -= penalty;
  };
  const review = (reason: string, penalty: number) => {
    reasons.push(reason);
    if (status === "trusted") status = "review_required";
    score -= penalty;
  };

  if (feed.signatureStatus === "invalid") quarantine("Cryptographic integrity check failed", 70);
  else if (feed.signatureStatus === "unverified") review("Source signature is not verified", 30);
  if (feed.regionId !== expectedRegionId) quarantine("Feed scope does not match the operational region", 70);
  if (observedAt > nowMs + CLOCK_SKEW_MS) quarantine("Observation time is in the future", 60);
  if (validUntil <= observedAt) quarantine("Validity window is internally inconsistent", 60);
  else if (validUntil <= nowMs) review("Feed validity window has expired", 35);
  if (ageSeconds > policy.maxAgeSeconds) review(`Feed age exceeds ${policy.maxAgeSeconds} seconds`, 25);
  if (feed.coveragePercent < policy.minCoveragePercent) review(`Coverage is below ${policy.minCoveragePercent}%`, 20);
  if (feed.conflicts.length > 0) review(`${feed.conflicts.length} unresolved cross-source conflict${feed.conflicts.length === 1 ? "" : "s"}`, 20);
  if (reasons.length === 0) reasons.push("Signature, freshness, scope, coverage and conflict checks passed");

  return {
    id: feed.id,
    sourceClass: feed.sourceClass,
    label: feed.label,
    status,
    score: Math.max(0, score),
    ageSeconds,
    coveragePercent: feed.coveragePercent,
    recordCount: feed.recordCount,
    signatureStatus: feed.signatureStatus,
    reasons,
  };
}

export function evaluateOperationalData(bundle: OperationalDataBundle, nowMs = Date.parse(DATA_TRUST_DEMO_TIME)): DataTrustEvaluation {
  if (!Number.isFinite(nowMs)) throw new Error("Evaluation time must be finite");
  const feeds = bundle.feeds.map((feed) => evaluateFeed(feed, bundle.regionId, nowMs));
  const missingSourceClasses = FEED_CLASSES.filter((sourceClass) => !feeds.some((feed) => feed.sourceClass === sourceClass));
  const blockers = [
    ...missingSourceClasses.map((sourceClass) => `Required source missing: ${sourceClass.replaceAll("_", " ")}`),
    ...feeds.filter((feed) => feed.status !== "trusted").flatMap((feed) => feed.reasons.map((reason) => `${feed.label}: ${reason}`)),
  ];
  const quarantined = missingSourceClasses.length > 0 || feeds.some((feed) => feed.status === "quarantined");
  const degraded = !quarantined && feeds.some((feed) => feed.status === "review_required");
  const planningMode: DataTrustEvaluation["planningMode"] = quarantined ? "quarantined" : degraded ? "degraded" : "verified";
  const rawScore = feeds.length === 0 ? 0 : feeds.reduce((sum, feed) => sum + feed.score, 0) / feeds.length;
  const missingPenalty = missingSourceClasses.length * 20;
  const boundedScore = Math.max(0, Math.round(rawScore - missingPenalty));
  const trustScore = planningMode === "quarantined" ? Math.min(39, boundedScore) : planningMode === "degraded" ? Math.min(79, boundedScore) : boundedScore;
  const nextAction = planningMode === "verified"
    ? "Present the verified bundle and modeled consequence to an authorized human reviewer."
    : planningMode === "degraded"
      ? "Refresh or reconcile the flagged source before consequential review."
      : "Quarantine this bundle; replace missing or invalid sources before planning.";
  return {
    schemaVersion: DATA_TRUST_SCHEMA_VERSION,
    policyId: DATA_TRUST_POLICY_ID,
    bundleId: bundle.bundleId,
    regionId: bundle.regionId,
    evaluatedAt: new Date(nowMs).toISOString(),
    planningMode,
    decisionGate: planningMode === "verified" ? "human_review_required" : "blocked",
    autonomousAction: "prohibited",
    trustScore,
    trustedFeeds: feeds.filter((feed) => feed.status === "trusted").length,
    totalFeeds: feeds.length,
    recordsEvaluated: feeds.reduce((sum, feed) => sum + feed.recordCount, 0),
    missingSourceClasses,
    blockers,
    nextAction,
    feeds,
  };
}

function demoFeed(input: Omit<OperationalDataFeed, "regionId" | "digest" | "conflicts"> & { digestChar: string; conflicts?: string[] }): OperationalDataFeed {
  const { digestChar, conflicts = [], ...feed } = input;
  return {
    ...feed,
    regionId: "jp-gifu-gujo-demo",
    digest: `sha256:${digestChar.repeat(64)}`,
    conflicts,
  };
}

export function buildDemoDataBundle(scenario: DataTrustDemoScenario = "verified"): OperationalDataBundle {
  const feeds: OperationalDataFeed[] = [
    demoFeed({ id: "topology-20260719", sourceClass: "map_topology", label: "Road topology snapshot", issuer: "https://demo.lifeline.invalid/map", sourceUri: "https://demo.lifeline.invalid/map/gujo.geojson", observedAt: "2026-07-18T06:00:00.000Z", validUntil: "2026-07-26T00:00:00.000Z", recordCount: 5481, coveragePercent: 100, signatureStatus: "verified", digestChar: "a" }),
    demoFeed({ id: "authority-20260719-1458", sourceClass: "road_authority", label: "Road authority restrictions", issuer: "https://demo.lifeline.invalid/authority", sourceUri: "https://demo.lifeline.invalid/authority/events", observedAt: "2026-07-19T14:58:00.000Z", validUntil: "2026-07-19T15:13:00.000Z", recordCount: 17, coveragePercent: 100, signatureStatus: "verified", digestChar: "b" }),
    demoFeed({ id: "weather-20260719-1455", sourceClass: "weather", label: "Regional weather observations", issuer: "https://demo.lifeline.invalid/weather", sourceUri: "https://demo.lifeline.invalid/weather/observations", observedAt: "2026-07-19T14:55:00.000Z", validUntil: "2026-07-19T15:25:00.000Z", recordCount: 64, coveragePercent: 98.4, signatureStatus: "verified", digestChar: "c" }),
    demoFeed({ id: "fleet-20260719-1459", sourceClass: "fleet_availability", label: "Operator fleet availability", issuer: "https://demo.lifeline.invalid/fleet", sourceUri: "https://demo.lifeline.invalid/fleet/status", observedAt: "2026-07-19T14:59:00.000Z", validUntil: "2026-07-19T15:04:00.000Z", recordCount: 38, coveragePercent: 100, signatureStatus: "verified", digestChar: "d" }),
  ];
  if (scenario === "stale_authority") {
    feeds[1] = { ...feeds[1], observedAt: "2026-07-19T12:00:00.000Z", validUntil: "2026-07-19T16:00:00.000Z" };
  } else if (scenario === "conflicting_weather") {
    feeds[2] = { ...feeds[2], conflicts: ["Radar rainfall exceeds station report", "Landslide watch status differs across issuers"] };
  } else if (scenario === "tampered_signature") {
    feeds[1] = { ...feeds[1], signatureStatus: "invalid", digest: `sha256:${"0".repeat(64)}` };
  } else if (scenario === "feed_outage") {
    feeds.splice(3, 1);
  }
  return {
    schemaVersion: DATA_TRUST_SCHEMA_VERSION,
    bundleId: `gujo-demo-${scenario}`,
    regionId: "jp-gifu-gujo-demo",
    createdAt: "2026-07-19T14:59:30.000Z",
    feeds,
  };
}

export async function buildDataTrustEvidence(bundle: OperationalDataBundle, evaluation: DataTrustEvaluation) {
  const sourceBundleDigest = `sha256:${await sha256Hex(bundle)}`;
  const evaluationDigest = `sha256:${await sha256Hex({ sourceBundleDigest, evaluation })}`;
  return {
    schemaVersion: DATA_TRUST_SCHEMA_VERSION,
    policyId: DATA_TRUST_POLICY_ID,
    bundleId: bundle.bundleId,
    evaluatedAt: evaluation.evaluatedAt,
    sourceBundleDigest,
    evaluationDigest,
    planningMode: evaluation.planningMode,
    decisionGate: evaluation.decisionGate,
    autonomousAction: evaluation.autonomousAction,
    sourceEvidence: bundle.feeds.map((feed) => ({ id: feed.id, sourceClass: feed.sourceClass, issuer: feed.issuer, digest: feed.digest })),
    blockers: evaluation.blockers,
    boundary: "Integrity and provenance checks do not prove physical road safety or authorize operational action.",
  };
}

export function canonicalDataTrustBundle(bundle: OperationalDataBundle) {
  return canonicalJson(bundle);
}
