# Lifeline Grid Pilot Readiness

Lifeline Grid is currently a **software pilot candidate for supervised simulation and shadow-mode evaluation**. It is not approved for real emergency dispatch, vehicle control, electrical switching, or public-safety decision-making.

The Regional Access mode is likewise advisory. It is not approved to diagnose structures, close roads, direct drivers, determine statutory inspection priority, or make eligibility decisions about residents. Its current road and delivery data are fictional.

This distinction is enforced in the product. A mission can become `simulation-ready` only after machine checks and independent human co-signing. `field-ready` remains false while telemetry, equipment, cybersecurity, authority, or field-validation evidence is missing.

## Maturity levels

| Level | Permitted use | Current status |
|---|---|---|
| L0 — Reproducible simulation | Fictional data, deterministic replay, no external actuation | Implemented |
| L1 — Tabletop exercise | Supervised emergency-planning workshop with fictional or de-identified data | Software-ready; partner and protocol required |
| L2 — Shadow mode | Read-only live feeds; recommendations compared with human decisions; no control | Not implemented |
| L3 — Hardware-in-the-loop lab | Certified test interfaces and instrumented electrical loads | Not implemented |
| L4 — Limited field pilot | Named authority, trained operators, dual control, rollback, independent evaluation | Not authorized |
| L5 — Production service | Jurisdiction-specific approval, certified integrations, service operations, continuous assurance | Not authorized |

## Implemented product controls

- source-linked GPT-5.6 or explicitly labeled synthetic-fallback interpretation;
- fail-closed physical constraints and protected mobility reserve;
- exact allocation search for the inspectable built-in scenario;
- deterministic 256-scenario bounded-uncertainty evaluation;
- exact value-of-information question ranking;
- exact N-1 vehicle/corridor contingency evaluation;
- independent Incident Lead and Safety Officer roles;
- portable evidence package with canonical JSON, SHA-256 package integrity, and a hash-chained event log;
- authenticated D1-backed regional plan history, predecessor diff, assigned reviewer, self-approval prevention, and server-side audit replay;
- explicit separation of simulation authorization and field qualification;
- automated planner, operational-control, API, rendering, and production-build tests.

## Field-qualification gates

All of the following must be independently evidenced before a real pilot. The application currently marks every item as blocked.

1. **Validated live telemetry** — authenticated, time-synchronized, freshness-bounded state of charge, route, connector, and availability data.
2. **Certified electrical interface** — approved V2L/V2H/V2B equipment, protection devices, installation procedures, inspection, and emergency isolation.
3. **Cybersecurity assurance** — threat-model review, penetration test, software supply-chain controls, key management, logging, incident response, and independent sign-off.
4. **Emergency authority** — a named local organization owns activation criteria, operator roles, accountability, data processing, and public communication.
5. **Supervised field validation** — pre-registered acceptance tests, failure injection, human-factors evaluation, recovery exercises, and an independent report.

## Proposed responsible rollout

### Phase A — Tabletop evaluation

- use fictional or formally approved de-identified scenarios;
- compare Lifeline output with an expert-created reference plan;
- measure plan quality, operator workload, time-to-decision, unsafe recommendation rate, and disagreement rate;
- prohibit external control and operational reliance.

Exit criteria: no unreported hard-constraint bypass, complete evidence packages, and documented operator feedback.

### Phase B — Read-only shadow mode

- connect authenticated read-only data adapters;
- timestamp and reject stale or incomplete telemetry;
- run beside the existing command process without influencing dispatch;
- investigate every disagreement and near miss.

Exit criteria: pre-agreed coverage, latency, freshness, availability, and false-safe thresholds over a representative trial window.

### Phase C — Hardware-in-the-loop

- use certified test equipment in a controlled lab;
- inject loss of telemetry, incorrect state of charge, route failure, connector mismatch, overload, and network partition;
- demonstrate fail-closed behavior and manual recovery.

Exit criteria: independent electrical, cybersecurity, and safety acceptance.

### Phase D — Limited field pilot

- activate only under a named authority and written operating procedure;
- retain two-person authorization and a manual isolation path;
- start with advisory output; do not enable autonomous actuation;
- predefine stop criteria, rollback, incident notification, and evidence retention.

## Product architecture still required

- organization/tenant-scoped authorization beyond the implemented creator/reviewer email boundary;
- KMS-signed append-only audit retention and legal hold beyond the implemented D1 hash chain;
- KMS-backed digital signatures rather than an in-browser integrity hash;
- authenticated telemetry and routing adapters with replay protection;
- configurable fleet/facility schemas and validated large-fleet optimization;
- monitoring, alerting, backups, recovery objectives, rate limits, and abuse prevention;
- privacy assessment, jurisdiction-specific legal review, contracts, insurance, and support operations.

For Regional Access, production additionally requires authoritative GIS topology, road-owner identifiers, inspection provenance, restriction freshness, validated travel costs, aggregated demand governance, transport-operator agreements, solver-scale benchmarks, and a formally approved service-equity policy. A road authority must own every structural interpretation and restriction; a licensed operator must own every real route decision.

## Ownership decisions required

Social implementation cannot be completed by software alone. A pilot sponsor must name the deployment country and locality, emergency authority, electrical-safety owner, cybersecurity owner, data controller, vehicle/fleet partner, facility partner, and independent evaluator. Those choices determine the applicable standards, law, procurement route, and acceptance evidence.
