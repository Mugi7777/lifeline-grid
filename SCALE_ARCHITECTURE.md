# Scale Architecture

The current browser demonstration is deliberately exact and small. A production Regional Access OS must preserve the same objectives and evidence while moving computation, identity, data, and operations into independently scalable services.

## Target architecture

### Control plane

- tenant and region registry;
- role-based access and organization boundaries;
- policy versions for criticality, equity, and approval;
- connector configuration and secret references;
- model and solver version registry; and
- signed decision and audit retention.

### Regional data plane

- authoritative PostGIS road and structure graph;
- immutable source snapshots with provenance and freshness;
- event stream for inspections, restrictions, weather, telemetry, orders, and operator state;
- privacy-preserving aggregated demand layer;
- routing cost service backed by a licensed mapping provider; and
- feature store for calibrated deterioration and disruption models.

### Decision plane

- language-to-state service with strict schemas and source links;
- graph reachability and service-area engine;
- fleet solver service;
- infrastructure portfolio solver;
- scenario and failure-injection service;
- explanation and counterfactual service; and
- policy engine that can block unsupported or unauthorized actions.

The optimization service never receives credentials for road control, vehicle actuation, or public notification. Operational systems consume advisory recommendations only through an explicitly approved integration.

## Solver portfolio

| Problem size | Method | Required evidence |
|---|---|---|
| Up to 10 demands within declared search budgets | Complete enumeration, as implemented | Certified optimum for stated model |
| 11–250 demands | Deterministic three-start insertion + 2-opt, as implemented | feasible constraints, replay identity, candidates evaluated, unknown gap |
| Tens to hundreds in production | Validated CP-SAT/MILP with bounded solve gap | incumbent, bound, gap, time, constraint report |
| Hundreds to thousands | decomposition plus adaptive large-neighborhood search | reproducible seed, lower bound, benchmark gap |
| Live rolling horizon | warm-started optimization with frozen commitments | previous-plan diff, stability cost, latency, fallback |
| Capital portfolio | integer optimization with scenario reduction | budget feasibility, risk coverage, sensitivity |

Large-scale results must never be labeled “optimal” without a solver bound. When time expires, the system reports the best feasible result and the remaining gap.

The current `/api/regional-plan` boundary is the first external decision-plane contract. It accepts at most 1 MB, 500 nodes, 2,000 roads, 250 demands, and 100 vehicles; validates finite quantities and graph references; selects exact enumeration only at ten demands or fewer and within explicit assignment/route-order budgets; and returns a canonical SHA-256 input identity. It remains unauthenticated, stateless, and advisory, so it is a pilot integration surface rather than a production control plane.

## Performance targets for a limited pilot

These are engineering targets, not achieved claims.

- road-event ingestion to validated machine state: p95 under 5 seconds;
- read-only regional state freshness: under 60 seconds for closures and fleet availability;
- 100-stop advisory re-plan: p95 under 10 seconds;
- 1,000-stop overnight plan: under 10 minutes with a declared optimality gap;
- single-road access impact lookup from precomputed scenarios: p95 under 500 ms;
- audit write durability: acknowledged only after replicated append-only storage;
- monthly advisory availability: 99.9%, excluding upstream authoritative-data outages; and
- recovery-point objective under 5 minutes, recovery-time objective under 60 minutes.

## Security and tenancy

- enterprise identity with phishing-resistant MFA for privileged roles;
- region-, organization-, and purpose-scoped authorization;
- per-tenant encryption keys and KMS-backed signatures;
- append-only, tamper-evident audit with retention and legal hold;
- signed connector events, timestamp checks, replay protection, and freshness bounds;
- software-bill-of-materials, pinned builds, vulnerability scanning, and provenance;
- independent penetration test and incident-response exercise; and
- no resident-level identity in the optimization service unless explicitly required and legally approved.

## Reliability and degraded modes

- reject stale or contradictory authority data rather than silently choosing one;
- preserve the last trusted graph snapshot and label its age;
- continue read-only analysis when language-model access is unavailable;
- use deterministic parsers or manual structured entry for critical events;
- retain the existing accepted plan when re-optimization fails;
- surface every dropped demand, relaxed soft preference, and solver gap; and
- provide exportable evidence for independent replay.

## Evaluation before scale claims

1. publish synthetic benchmark generators and frozen reference cases;
2. compare against a licensed generic route optimizer on the same transport objective;
3. separately measure the value of Lifeline’s access, equity, and road-risk objectives;
4. run shadow evaluations on de-identified historical operations;
5. pre-register acceptance thresholds and failure categories;
6. have an independent evaluator reproduce results; and
7. measure prediction error and operator overrides after deployment.

Google- or Cainiao-class credibility comes from repeated real-world evidence and service operations, not an algorithm name. This architecture defines the path without claiming that the current prototype has already completed it.
