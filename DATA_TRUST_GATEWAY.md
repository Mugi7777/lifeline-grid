# Operational Data Trust Gateway

Lifeline Grid must not turn an available feed into a trusted operational fact. The Data Trust Gateway is a strict, deterministic boundary in front of planning. It evaluates a versioned bundle of map topology, road-authority restrictions, weather observations, and fleet availability before any consequential review.

## Machine-enforced checks

Each feed is bounded by an explicit schema and checked for:

- a unique identity and supported source class;
- HTTPS issuer and source references without embedded credentials;
- SHA-256 content-digest shape and signature status;
- observation time, validity window, clock skew, and class-specific maximum age;
- exact regional scope;
- class-specific minimum coverage;
- unresolved cross-source conflicts; and
- bounded record and conflict counts.

Unknown fields, duplicate feed identities, malformed timestamps, unsupported classes, oversized bundles, and malformed digests fail schema validation. Invalid signatures, out-of-region sources, impossible time windows, missing required source classes, stale data, low coverage, and conflicts remain visible in the evaluation instead of being averaged away.

## Operating modes

| Mode | Trigger | Allowed outcome |
|---|---|---|
| `verified` | Every required feed passes | Present modeled consequences to an authorized human reviewer |
| `degraded` | A feed is stale, incomplete, unsigned, or conflicting | Read-only analysis; consequential review is blocked |
| `quarantined` | Invalid integrity, wrong scope, impossible time, or missing required class | Bundle is excluded from planning |

Autonomous action is prohibited in every mode. A verified bundle proves only that declared provenance and quality gates passed. It does not diagnose a structure, establish physical road safety, or grant authority to close a road or dispatch a vehicle.

## Reproducible demonstration

The interface contains five deterministic failure injections:

1. a complete verified bundle;
2. a stale road-authority feed;
3. conflicting weather observations;
4. a tampered authority signature; and
5. a missing fleet feed.

Each scenario changes the feed verdicts, trust score, operating mode, decision gate, blockers, and next action. The export button creates a canonical SHA-256 evidence manifest binding the source bundle to the evaluation without exporting source payloads.

The public `POST /api/data-trust` route accepts at most the application-wide bounded JSON size, performs strict parsing, evaluates freshness against server time, returns no-store evidence, and persists nothing. Because its caller is not an authenticated server-owned adapter, the route always adds a transport-trust blocker and cannot advance a bundle to consequential human review. In production, an adapter may assert a verified signature status only after performing the corresponding cryptographic verification; road-authority events use the separate pinned-key verifier.

## Pilot boundary

The bundled feed records, issuers, URLs, digests, timestamps, and regional identity are fictional. Production requires data-owner contracts, registered signing keys, authenticated transports, replay protection, secrets management, availability targets, adapter conformance tests, outage exercises, retention rules, privacy review, and supervised shadow-mode validation.
