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
4. Browser → exported evidence file
5. Future external telemetry/routing systems → Lifeline adapters
6. Future Lifeline service → vehicles, facilities, and incident-management systems

## Threats and controls

| Threat | Failure mode | Current control | Required before field pilot |
|---|---|---|---|
| Prompt injection in reports | Attacker manipulates interpretation or instructions | strict output schema; model cannot authorize or perform safety arithmetic | content isolation, adversarial test corpus, provenance policy, monitoring |
| Fabricated or stale telemetry | Unsafe plan uses incorrect SoC, route, or availability | current product uses only labeled synthetic data | authenticated sources, freshness bounds, clock sync, replay protection, cross-checks |
| Constraint bypass | UI or model claims a physically unsafe plan | consequential checks are deterministic and fail closed | independent solver validation, property testing, safety review, change control |
| Approval spoofing | One person or attacker authorizes a mission | separate fictional Lead and Safety Officer identities; dual-control gate | enterprise identity, phishing-resistant MFA, RBAC/ABAC, session assurance |
| Audit tampering | Decision evidence is edited after the event | canonical JSON, SHA-256 package hash, hash-chained events | server-side append-only ledger, KMS signature, trusted timestamps, retention policy |
| Secret exposure | API or integration credentials leak | API key remains a hosted secret and is not exported | secret rotation, least privilege, KMS/HSM, scanning, incident procedure |
| Denial of service | Planning or evidence generation unavailable during an incident | deterministic fallback keeps the synthetic demo usable | multi-region design, capacity tests, queues, offline runbook, recovery objectives |
| Malicious dependency | Compromised package alters behavior | lockfile and automated build tests | SBOM, provenance verification, dependency policy, signed releases, vulnerability response |
| Cross-tenant access | One organization sees another's incident data | site is currently access-restricted | tenant isolation, authorization tests, encryption, audit monitoring |
| Unsafe external actuation | Software command causes physical harm | no real adapters or autonomous control exist | certified adapter boundary, interlocks, two-person control, emergency stop, staged rollout |

## Safety-security invariants

- GPT output never authorizes action.
- No guessed operator fact can pass the decision gate.
- Any failed hard constraint blocks the plan.
- Any incomplete N-1 certificate is displayed as incomplete.
- One actor cannot satisfy both approval roles.
- Synthetic data and field data must never be visually indistinguishable.
- An integrity hash is never described as identity, non-repudiation, or a digital signature.
- Missing telemetry or qualification evidence must fail closed.

## Security verification backlog

- structured prompt-injection and data-poisoning tests;
- authorization matrix and tenant-isolation tests;
- dependency and container scanning in CI;
- SAST, DAST, API fuzzing, and penetration testing;
- cryptographic key lifecycle and rotation design;
- backup restoration and disaster-recovery exercise;
- external incident response and vulnerability-disclosure process.
