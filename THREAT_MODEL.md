# Lifeline Grid Threat Model

Scope: the current synthetic simulation and the proposed future advisory pilot. Real vehicle control and electrical switching are explicitly out of scope.

## Assets

- regional road topology, inspection provenance, restrictions, and intervention budgets;
- aggregated delivery demand and vulnerable-population indicators;
- multi-operator fleet availability and commercial boundaries;

- facility demand, priority, deadline, and source evidence;
- vehicle availability, state of charge, connector, route, and reserve policy;
- deterministic planner and contingency rules;
- human approvals and role identity;
- operational event history and exported evidence packages;
- API credentials and future telemetry credentials.

## Trust boundaries

1. Human narrative → GPT-5.6 interpretation
2. Structured state → deterministic safety kernel
3. Planner result → human approval workflow
4. Authenticated browser → identity-scoped D1 decision ledger
5. Pinned road-authority public key → signed event verifier → durable replay receipt
6. External map, authority, weather, and fleet feeds → Data Trust Gateway
7. Browser → exported evidence file
8. Future external telemetry/routing systems → Lifeline adapters
9. Future Lifeline service → vehicles, facilities, and incident-management systems

## Threats and controls

| Threat | Failure mode | Current control | Required before field pilot |
|---|---|---|---|
| Prompt injection in reports | Attacker manipulates interpretation or instructions | report is explicitly untrusted data; strict schema and runtime allowlists; model cannot authorize or perform safety arithmetic; adversarial API fixture | content isolation, broader red-team corpus, provenance policy, monitoring |
| Hypothesis collapse | Three differently worded hypotheses encode the same operational state and hide alternatives | exact IDs, unique hypotheses, bounded road states, and deterministic state-disagreement reporting | semantic-diversity evaluation, abstention policy, domain-owned rare-state corpus |
| Authority-source spoofing | Informal passage report is treated as an official restriction or proof of safety | versioned ECDSA P-256 envelope; pinned issuer/key/road scope; expiry and official-reference validation; verified events remain pending human review | production key ceremony, revocation, KMS/HSM custody, cross-source reconciliation, independent review |
| Signed-event replay or reordering | An old authentic closure silently overwrites newer state | atomic D1 acceptance gate rejects duplicate event IDs and any lower/equal issuer sequence; unique digest and sequence indexes | concurrency/load test, restore test, issuer sequence-reset procedure, multi-region ordering design |
| Adapter-attestation spoofing | A caller labels an unverified feed as signature-verified | public data-trust validation is explicitly untrusted and always blocks consequential review; production status must originate from a server-owned adapter | mTLS/OIDC workload identity, adapter signing, conformance tests, key rotation, independent assessment |
| Stale, partial, or conflicting feeds | An apparently complete route uses expired or mutually inconsistent inputs | class-specific freshness and coverage limits, exact region scope, missing-class detection, visible conflict blockers, degraded/quarantined modes | data-owner SLAs, clock monitoring, live outage exercises, reconciliation runbook |
| Confidence misuse | Model support score is displayed or consumed as permission to act | confidence is bounded and labeled support; action gate is hard-coded human-authority-required | calibration study, UI human-factors test, policy enforcement outside the UI |
| Fabricated or stale telemetry | Unsafe plan uses incorrect SoC, route, or availability | current product uses only labeled synthetic data | authenticated sources, freshness bounds, clock sync, replay protection, cross-checks |
| Constraint bypass | UI or model claims a physically unsafe plan | consequential checks are deterministic and fail closed | independent solver validation, property testing, safety review, change control |
| Approval spoofing | One person or attacker authorizes a mission | server-side creator/reviewer identity separation and exact reviewer assignment | enterprise membership, phishing-resistant MFA, RBAC/ABAC, session assurance |
| Audit tampering | Decision evidence is edited after the event | canonical JSON, D1 persistence, predecessor hashes, event-chain replay, and stored-record binding verification | KMS signature, trusted timestamps, write-once retention, legal hold |
| Secret exposure | API or integration credentials leak | API key remains a hosted secret and is not exported | secret rotation, least privilege, KMS/HSM, scanning, incident procedure |
| Denial of service | Oversized input exhausts planning compute or evidence generation is unavailable | strict 1 MB/model cardinality limits, finite-number checks, exact-search budgets, bounded scalable fallback | authenticated quotas, distributed rate limits, queues, multi-region capacity tests, offline runbook, recovery objectives |
| Malicious dependency | Compromised package alters behavior | lockfile, deterministic CI, high/critical production audit gate, CodeQL, and Dependabot | SBOM, protected provenance, dependency allowlist, signed releases, vulnerability-response exercise |
| Cross-tenant access | One organization sees another's incident data | site access restriction plus creator/assigned-reviewer row filtering | tenant isolation, authorization-matrix tests, encryption, audit monitoring |
| Unsafe external actuation | Software command causes physical harm | no real adapters or autonomous control exist | certified adapter boundary, interlocks, two-person control, emergency stop, staged rollout |

## Safety-security invariants

- GPT output never authorizes action.
- Every reasoning proposal is revalidated and every valid hypothesis is independently re-planned.
- Model confidence and hidden chain-of-thought are never operational evidence.
- No guessed operator fact can pass the decision gate.
- Any failed hard constraint blocks the plan.
- Any incomplete N-1 certificate is displayed as incomplete.
- One actor cannot satisfy both approval roles.
- Synthetic data and field data must never be visually indistinguishable.
- An integrity hash is never described as identity, non-repudiation, or a digital signature.
- Missing telemetry or qualification evidence must fail closed.
- A valid authority signature can only establish source integrity; it cannot prove physical road safety or authorize an action.
- Duplicate or stale issuer sequences can never enter the human review queue.
- A client-declared signature status from the public validation API can never unlock consequential review.
- Missing, stale, conflicting, out-of-scope, or integrity-invalid required feeds cannot be hidden by an aggregate trust score.

## Security verification backlog

- expanded structured prompt-injection, semantic-diversity, source-spoofing, and data-poisoning tests;
- production road-authority key ceremony, revocation, cross-source reconciliation, and multi-region replay testing;
- authenticated server-owned adapters, workload identity, feed-level replay defense, and outage/conflict exercises;
- authorization matrix and tenant-isolation tests;
- dependency and container scanning in CI;
- SAST, DAST, API fuzzing, and penetration testing;
- cryptographic key lifecycle and rotation design;
- backup restoration and disaster-recovery exercise;
- external incident response and vulnerability-disclosure process.
