# Lifeline Grid Emergency Power 2.0

## Product thesis

Emergency Power is a decision-support system for coordinating mobile batteries when reports about roads, assets, or facility loads conflict. It is not a chatbot and it is not an electrical or dispatch control system.

The central loop is:

```text
untrusted incident report
        ↓
GPT-5.6 Sol: exactly three falsifiable worlds
        ↓ strict allowlisted contract
exact allocation + physical constraints in every world
        ↓
256-point low-discrepancy stress suite per candidate plan
        ↓
counterfactual evidence-value ranking
        ↓
human fact verification + independent dual control
        ↓
canonical SHA-256 audit package
```

Sol is permitted to structure ambiguity, preserve counterevidence, state assumptions, and propose evidence requests. It is prohibited from performing the safety arithmetic, inventing routes or assets, applying a world, or authorizing action. Deterministic code independently calculates every displayed consequence.

## Bounded exact algorithms

For each vehicle–facility assignment, the kernel independently verifies:

- modeled route availability;
- V2L/V2H connector compatibility;
- momentary output-power envelope;
- arrival deadline;
- continuous-energy duration; and
- protected post-mission mobility reserve.

The optimizer enumerates all injective assignments for five assets and three facilities (`5 × 4 × 3 = 60`) and ranks them lexicographically so critical feasibility cannot be traded for convenience. Every candidate is tested against 256 deterministic Halton scenarios covering demand ±10%, reported SoC ±5 percentage points, and travel energy/time ±20%, plus the joint adverse corner.

The Sol council changes three independent facts—road state, high-output asset availability, and pump peak mode—then re-runs the kernel in all three worlds. The fallback fixture produces:

| World | Critical coverage | Critical gap | Full-mission stress success |
|---|---:|---:|---:|
| H1 nominal | 12 h | 0 kWh | 100% |
| H2 bridge restricted | 12 h | 0 kWh | 100% |
| H3 E-44 lost + 6.5 kW peak | 8 h | 16.8 kWh | 0% |

Across the three worlds the system evaluates 144 exact assignment candidates, 768 stress suites and 36,864 candidate-plan/scenario pairs. Counterfactual value-of-information ranks an authenticated pump start-up reading first because it separates a 16.8 kWh critical gap, four critical site-hours and a 100-point full-mission swing.

The N-1 engine then tests five single-vehicle losses and seven single-route closures against three preparedness actions. It performs 414,720 additional plan/scenario evaluations. In the nominal fixture it selects “Stage E-32 at West Relay” and improves modeled critical protection from 10/12 to 12/12 single-failure cases.

All figures are deterministic results for fictional inputs. They are not calibrated probabilities or field-performance claims.

## Map and interaction

The first viewport now uses a real OpenStreetMap basemap over Kochi. Every facility, vehicle position, route connector, road state and demand is synthetic and labeled as such. It is not turn-by-turn navigation. Selecting H1, H2 or H3 changes only an inspection state; no model world is applied automatically.

Each assignment exposes its six checks and a before/after SoC trajectory. The UI compares the exact result with the deterministic greedy baseline on the same state, displays the actual candidate and stress counts, and exposes the evidence question with the greatest modeled consequence.

## Safety and audit boundary

The API uses `gpt-5.6-sol` with high reasoning effort, strict Structured Outputs, `store: false`, bounded input, allowlisted IDs, and runtime validation. Invalid schemas, duplicate worlds, invented state, unavailable API access, and missing keys fail to a visibly labeled deterministic fixture rather than an unverified free-form answer.

The model recommendation is always `withheld_pending_evidence`. Exercise confirmation requires two separate UI roles and exports a canonical council package with a SHA-256 digest. This is a tabletop audit mechanism—not authentication, a qualified electronic signature, or emergency authority.

Field operation remains blocked. Deployment would require authenticated authoritative data, live fleet integration, road and electrical validation, incident-command integration, tenant isolation, KMS-backed identity and signatures, observability, disaster recovery, supervised trials, independent cybersecurity review, and all applicable legal/certification work.

## What “Google-class” means here

This release does not claim Google-scale traffic, global map freshness, production SRE maturity, or safety certification. It implements the product properties that should survive a scale-up:

- clear separation of probabilistic reasoning from deterministic consequence calculation;
- strict, versioned machine contracts;
- deterministic replay and integrity evidence;
- fail-closed authority boundaries;
- solver evidence and honest optimality scope;
- degraded fallback behavior; and
- a real basemap with explicit data provenance.

The production solver path is a portfolio: bounded exact search for auditable incidents, mixed-integer/constraint programming for medium deployments, and large-neighborhood search plus decomposition for large fleets. Online replanning would use warm starts and incremental state updates. The data plane would separate authoritative road/fleet/facility adapters from the decision plane, and a multi-region control plane would provide tenant isolation, policy, audit and recovery.

The benchmark is reproducible with:

```bash
npm run benchmark:emergency
```

Use the output as a local bounded-model measurement only; it is not an SLA.
