# Lifeline Grid Assurance Case

Status: **prototype software evidence; not certified; field operation blocked**.

This document defines the safety claim that the software is allowed to make, the evidence currently available, and the independent evidence that remains missing. It is deliberately stricter than a feature checklist: a missing or stale item defeats readiness rather than lowering a cosmetic score.

## Top-level claim

> Lifeline Grid may be used for reproducible synthetic simulation and supervised tabletop evaluation. It must not be relied on to diagnose a road, close or reopen a road, dispatch a vehicle, determine resident eligibility, or control physical equipment.

The application and `/api/assurance` enforce the current claim as:

- `certification: not_certified`
- `fieldOperation: blocked`
- `autonomousAuthority: prohibited`

No code path converts test success, model confidence, a signature, or a hash into a certification claim.

## Claims, evidence, and defeaters

| Claim | Current evidence | Defeater / open gate |
|---|---|---|
| A road event came from a pinned authority key and was not altered | ECDSA P-256/SHA-256 verification over a canonical, versioned envelope; issuer, key ID, road scope, validity window, and official HTTPS reference validation | Authority key ceremony, revocation process, and production trust registry are not established |
| A previously accepted event cannot be silently accepted again | D1 event ID, digest, issuer-sequence indexes, and an atomic `INSERT … WHERE NOT EXISTS` stale-sequence gate | Migration and durable binding must be proven in the target environment; restore and race tests remain external gates |
| A valid signature cannot authorize a road or dispatch decision | Verified events receive `human_review_required`, `planningEffect: not_applied`, and `reviewStatus: pending` | A named authority, trained reviewers, enterprise identity, and approved operating procedure are missing |
| AI interpretation cannot directly alter safety arithmetic | Strict schemas and allowlists; each hypothesis is independently re-planned by deterministic code; model recommendation is withheld | Independent AI red-team, calibration, human-factors study, and monitored shadow evaluation are missing |
| A stored regional plan is attributable and tamper-evident | Authenticated creator/reviewer separation, server-side recomputation, canonical SHA-256 digest, predecessor diff, and replayable event hash chain | Enterprise tenant isolation, KMS signatures, trusted timestamps, retention, legal hold, and external audit are missing |
| The bounded optimizer obeys declared constraints | Deterministic planner tests for capacity, cold chain, deadlines, shifts, weight limits, uncertainty, and N-1 cases | Independent solver validation, real data quality qualification, larger scale benchmarks, and domain acceptance thresholds are missing |
| The service can recover safely from disruption | A supervised simulation runbook and fail-closed dependency states exist | Defined RTO/RPO, multi-region architecture, observed backup restoration, incident exercise, and service operations are missing |

## Cryptographic authority-event contract

The authority adapter accepts one exact schema version. The signed content includes:

- unique event ID, issuer URI, key ID, monotonic sequence, issue time, and expiry;
- road segment, state, optional weight limit, effective interval, official reference, and reason; and
- a raw ECDSA P-256 signature encoded with base64url.

The maximum signed lifetime is 24 hours. Effective time must remain inside the signature validity window. Events fail closed for malformed data, unsupported schema, unknown issuer or key, road-scope mismatch, future issue time beyond clock skew, expiry, invalid signature, duplicate event ID, or stale sequence.

Only public keys belong in `AUTHORITY_TRUST_REGISTRY_JSON`. The parser rejects JWK private-key material. Key rotation uses a new `keyId`; production rotation and revocation require a documented two-person ceremony and out-of-band issuer verification.

## Evidence inventory

- `lib/authority-event.ts` — bounded contract, trust-registry parser, signature verification, and action gate.
- `app/api/authority-events/verify/route.ts` — authenticated ingestion and atomic durable replay rejection.
- `db/schema.ts` and `drizzle/0001_opposite_the_hunter.sql` — event receipts and uniqueness constraints.
- `lib/assurance.ts` and `/api/assurance` — machine-readable claims, controls, and open gates.
- `/api/health` — liveness separated from operational readiness.
- `tests/authority-event.test.ts` — valid signature, tamper, scope, time, and private-key rejection tests.
- `tests/assurance.test.ts` — proof that code-only runtime success cannot self-assert certification.
- `lib/nankai-response.ts`, `tests/nankai-response.test.ts`, and `NANKAI_RESPONSE_LAB.md` — bounded multi-modal counterfactual evidence, fail-closed route invariants, deterministic replay, and the human-only action boundary.
- `THREAT_MODEL.md`, `RUNBOOK.md`, and `PILOT_READINESS.md` — threats, stop conditions, and rollout boundaries.

## Evidence acceptance rules

Evidence is accepted only when it is versioned, reproducible, attributable to an owner, time-bounded where applicable, and reviewed by someone other than the implementer for consequential controls. Screenshots, model prose, unversioned spreadsheets, self-signed declarations, and passing demo scenarios are not certification evidence.

Every operational release must bind the assurance snapshot to an immutable release identifier, dependency lockfile, migration set, test result, SBOM, vulnerability disposition, and change approval. This binding is not yet implemented and remains a release-engineering gate.

## Independent gates

Before any operational claim, all of the following need signed evidence from the named external owner:

1. road-authority public-key ceremony and revocation test;
2. tenant-isolation and authorization-matrix assessment;
3. independent penetration test with critical findings closed;
4. observed backup restoration and disaster-recovery exercise;
5. supervised regional shadow pilot with pre-registered metrics;
6. applicable management-system certification audit; and
7. jurisdiction-specific legal, transport, privacy, procurement, and safety approval.

Until then, the only valid product state is **not certified / field blocked**.
