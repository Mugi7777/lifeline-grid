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
5. Browser → exported evidence file
6. Future external telemetry/routing systems → Lifeline adapters
7. Future Lifeline service → vehicles, facilities, and incident-management systems

## Threats and controls

| Threat | Failure mode | Current control | Required before field pilot |
|---|---|---|---|
| Prompt injection in reports | Attacker manipulates interpretation or instructions | report is explicitly untrusted data; strict schema and runtime allowlists; model cannot authorize or perform safety arithmetic; adversarial API fixture | content isolation, broader red-team corpus, provenance policy, monitoring |
| Hypothesis collapse | Three differently worded hypotheses encode the same operational state and hide alternatives | exact IDs, unique hypotheses, bounded road states, and deterministic state-disagreement reporting | semantic-diversity evaluation, abstention policy, domain-owned rare-state corpus |
| Authority-source spoofing | Informal passage report is treated as an official restriction or proof of safety | authority status is ranked as a human safety gate; recommendation remains withheld | signed authority adapters, freshness/revocation, issuer registry, cross-source reconciliation |
| Confidence misuse | Model support score is displayed or consumed as permission to act | confidence is bounded and labeled support; action gate is hard-coded human-authority-required | calibration study, UI human-factors test, policy enforcement outside the UI |
| Fabricated or stale telemetry | Unsafe plan uses incorrect SoC, route, or availability | current product uses only labeled synthetic data | authenticated sources, freshness bounds, clock sync, replay protection, cross-checks |
| Constraint bypass | UI or model claims a physically unsafe plan | consequential checks are deterministic and fail closed | independent solver validation, property testing, safety review, change control |
| Approval spoofing | One person or attacker authorizes a mission | server-side creator/reviewer identity separation and exact reviewer assignment | enterprise membership, phishing-resistant MFA, RBAC/ABAC, session assurance |
| Audit tampering | Decision evidence is edited after the event | canonical JSON, D1 persistence, predecessor hashes, event-chain replay, and stored-record binding verification | KMS signature, trusted timestamps, write-once retention, legal hold |
| Secret exposure | API or integration credentials leak | API key remains a hosted secret and is not exported | secret rotation, least privilege, KMS/HSM, scanning, incident procedure |
| Denial of service | Oversized input exhausts planning compute or evidence generation is unavailable | strict 1 MB/model cardinality limits, finite-number checks, exact-search budgets, bounded scalable fallback | authenticated quotas, distributed rate limits, queues, multi-region capacity tests, offline runbook, recovery objectives |
| Malicious dependency | Compromised package alters behavior | lockfile and automated build tests | SBOM, provenance verification, dependency policy, signed releases, vulnerability response |
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

## Security verification backlog

- expanded structured prompt-injection, semantic-diversity, source-spoofing, and data-poisoning tests;
- signed road-authority source adapters and report-freshness enforcement;
- authorization matrix and tenant-isolation tests;
- dependency and container scanning in CI;
- SAST, DAST, API fuzzing, and penetration testing;
- cryptographic key lifecycle and rotation design;
- backup restoration and disaster-recovery exercise;
- external incident response and vulnerability-disclosure process.
