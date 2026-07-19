# Lifeline Grid

**Keep every resident connected to essentials—even when roads age or disasters strike.**

Lifeline Grid is a Japan-first **Regional Access OS** and an OpenAI Build Week 2026 prototype for the **Work & Productivity** track. Its new default mode joins rural shared delivery, road-aging impact, repair-budget allocation, and emergency continuity in one inspectable regional twin. The original emergency mobile-power command center remains available as a second mode.

> Synthetic simulation only. Lifeline Grid does not control real vehicles, facilities, or emergency operations. Demo metrics are scenario results, not real-world performance claims.

## Regional Access OS

The synthetic Mizunoki District model connects eight locations with twelve roads and coordinates six delivery zones across a postal EV, a refrigerated co-op van, and a municipal mixed-use bus. It evaluates:

- delivery capacity, cold chain, time windows, shifts, and road weight limits;
- every modeled single-road failure;
- households and vulnerable residents losing on-time access;
- exact pooled fleet assignments for the inspectable six-stop scenario;
- a deterministic three-start insertion and 2-opt solver for bounded requests up to 250 demand zones, with no false optimality claim;
- a deterministic 64-scenario demand and travel stress suite; and
- every eligible repair portfolio under an adjustable public budget.

Authenticated users can explicitly record a plan in a durable D1 decision ledger. The server recomputes the plan, links it to the prior version, stores the operational diff, assigns an optional independent reviewer, and appends SHA-256-linked audit events. The creator cannot approve their own run.

The **Production Trust Plane** adds a versioned signed road-authority envelope. It verifies an ECDSA P-256/SHA-256 signature against a pinned issuer, key ID and road scope; bounds issue, expiry and effective time; and atomically rejects duplicate IDs and stale issuer sequences in D1. A valid event is stored only as `pending` with `human_review_required` and `planningEffect: not_applied`. Cryptographic integrity never becomes road diagnosis or permission to act.

The same plane exposes `/api/assurance` and `/api/health`. It reports software evidence separately from independent gates and always declares this release **not certified / field blocked**. See [`ASSURANCE_CASE.md`](./ASSURANCE_CASE.md), [`CERTIFICATION_ROADMAP.md`](./CERTIFICATION_ROADMAP.md), and [`SECURITY.md`](./SECURITY.md).

The baseline exact plan covers all 418 modeled households and 152 modeled vulnerable residents on time. Removing North Forest Road makes one community miss its service threshold—64 households and 32 vulnerable residents—while both critical deliveries remain protected. These values are deterministic fictional results.

GPT-5.6 converts a narrative inspection note into a supported road event. The new **Sol Reasoning Council** uses `gpt-5.6-sol` at high reasoning effort to turn conflicting, untrusted reports into exactly three testable road-state hypotheses, preserve counterevidence, and ask for the smallest decision-changing fact. Deterministic code then re-plans every hypothesis, runs 192 stress scenarios and 36 N-1 road cases, and withholds the model recommendation behind a human-authority gate. The model cannot diagnose a road, calculate the consequence, authorize a closure, or authorize dispatch.

See [`REGIONAL_PRODUCT.md`](./REGIONAL_PRODUCT.md) for the product definition and [`COMPETITIVE_STRATEGY.md`](./COMPETITIVE_STRATEGY.md) for the explicit Google/Cainiao build-partner boundary.
See [`SCALE_ARCHITECTURE.md`](./SCALE_ARCHITECTURE.md) for the production control plane, solver portfolio, security model, degraded modes, and measurable service targets.

## Why this is not a chatbot

A chatbot can summarize a power request. Emergency coordination also requires state, constraints, optimization, authorization, evaluation, and recovery.

In Regional Access mode the system goes further than a single model answer:

```text
Conflicting untrusted reports
      ↓
GPT-5.6 Sol: three competing, falsifiable road states
      ↓
Strict schema + supported-road validation
      ↓
Deterministic re-plan of every world
      ↓
192 stress scenarios + 36 N-1 road cases
      ↓
Rank the evidence with the largest access consequence
      ↓
Human road authority required; model recommendation withheld
```

For the built-in synthetic conflict, the authority-status question separates a world with no access loss from one exposing 64 households and 32 vulnerable residents. That consequence is reproduced by the regional kernel; it is not a number supplied by the model.

Lifeline Grid closes that loop:

```text
Fictional reports
      ↓
GPT-5.6: source-linked power contracts
      ↓
Unsafe candidate → visibly rejected
      ↓
Decision-Critical Planner
      ↓
One highest-value operator question
      ↓
Exact multi-objective allocation search
      ↓
256-scenario uncertainty stress test
      ↓
Exact N-1 contingency search
      ↓
Minimum-intervention reserve action
      ↓
Incident Lead approval → independent Safety Officer co-sign
      ↓
Hash-chained evidence package → simulation authorization
      ↑                                      ↓
      └──────── GPT-5.6 event → global re-plan ┘
```

GPT-5.6 interprets language. Deterministic code performs safety arithmetic and optimization. Two distinct human roles are required to authorize the simulation. Field deployment remains fail-closed until external qualification evidence exists.

## The three-minute mission loop

1. Three fictional facilities report power needs in natural language.
2. **GPT-5.6 Structured Outputs** extracts source-linked power, duration, deadline, priority, connector, confidence, and assumptions.
3. A plausible nearest-looking assignment sends E-12 to the clinic.
4. The safety kernel rejects it because duration and the protected 35% mobility reserve fail.
5. The Decision-Critical Planner tests three unresolved assumptions and both possible answers to each.
6. For every answer world, it compares keeping the provisional allocation with re-optimizing all 60 allocations across all 256 stress scenarios—**93,696 exact counterfactual plan-scenario evaluations**.
7. It ranks the pump start-up surge question first because guessing wrong creates 226 avoidable violation scenarios and changes two vehicle missions.
8. An operator confirms whether the station caps the surge locally. A guessed fact can never authorize dispatch.
9. The optimizer evaluates every one of the **60 distinct vehicle allocations** against the confirmed machine state.
10. Each allocation is tested across a deterministic **256-point Halton uncertainty suite** covering demand, state-of-charge, and travel-time variation.
11. The selected plan succeeds in all 256 demo scenarios. The nearest-feasible baseline succeeds in 207/256.
12. The N-1 engine evaluates three preparedness actions against five vehicle losses and seven corridor closures—**414,720 additional plan-scenario evaluations**.
13. The unhardened plan protects critical service in 10/12 single-failure cases. Exact minimum-intervention selection stages idle E-32 at West Relay and raises that result to 12/12.
14. The Incident Lead approves the simulated scope.
15. A distinct Safety Officer independently co-signs; the same actor cannot satisfy both roles.
16. Lifeline can export a canonical JSON safety-case package with a SHA-256 package hash and hash-chained audit events.
17. GPT-5.6 converts a narrative East Bridge closure into a machine-readable route event. The optimizer rebuilds the whole remaining mission plan and retains 100% scenario success.

## Optimization and safety kernel

For each vehicle–facility pair, the kernel checks:

- route availability;
- connector compatibility;
- maximum output power;
- arrival deadline;
- required service duration; and
- post-mission mobility reserve.

Continuous energy and momentary peak power are modeled separately. A four-hour 4.2 kW pump mission still consumes 16.8 kWh when its start-up peak is 6.5 kW, but the assigned inverter must independently survive that peak.

The energy available above the protected reserve is calculated as:

```text
usable kWh = capacity × (SoC − reserve) × efficiency − round-trip travel energy
```

The current exact search enumerates all injective assignments for three facilities and five vehicles: `5 × 4 × 3 = 60` complete allocations. Every allocation is also tested against 256 reproducible low-discrepancy scenarios:

- demand: ±10%;
- state of charge: ±5 percentage points; and
- travel time and travel energy: ±20%.

The selected plan must additionally survive the joint adversarial corner: demand +10%, SoC −5 points, and travel +20%. No hard constraint is relaxed to force a result. See [`EVALS.md`](./EVALS.md) for the reproducible evaluation and limitations.

### Decision-Critical Planner

The built-in fictional scenario contains three operator-owned uncertainty probes: pump start-up surge, possible shelter heating load, and the clinic cold-chain window. For each question and answer, deterministic code:

1. applies the answer as machine state;
2. stress-tests the existing provisional allocation;
3. re-optimizes all 60 complete allocations;
4. stress-tests the new optimum across the same 256 scenarios; and
5. ranks the question by avoidable violations, criticality, and mission changes.

The current top-ranked question is whether the water station handles its start-up surge. If the 6.5 kW peak reaches the vehicle, keeping the provisional plan fails 226/256 bounded scenarios; asking first and re-optimizing changes two missions and restores 256/256. The equal-weight two-answer test avoids 113 scenarios in expectation. These are fictional counterfactual results, not calibrated probabilities.

### N-1 Resilience Planner

A plan that survives continuous uncertainty can still contain a discrete single point of failure. Lifeline therefore tests 12 modeled N-1 cases: loss of each of five vehicles and closure of each of seven current or candidate corridors.

For every contingency and preparedness action, deterministic code re-runs the complete allocation search and all 256 uncertainty scenarios. The current three action candidates are no preventive action, staging idle E-32 at West Relay, and pre-charging E-12. This produces `3 × ((5 × 24 × 256) + (7 × 60 × 256)) = 414,720` candidate plan-scenario evaluations.

Without preparation, E-07 loss and River Road closure expose clinic service, so only 10/12 cases protect critical service across the full stress suite. The minimum-burden action stages idle E-32 on an independent clinic corridor. That eliminates both modeled single points and certifies 12/12 N-1 critical-service recovery for the confirmed 4.2 kW pump-peak world.

The certificate is conditional, not cosmetic. If the operator instead confirms a 6.5 kW pump peak, only E-44 can meet that peak in the fictional fleet and the UI reports 10/12 rather than claiming N-1 safety.

### Operational Trust Layer

Algorithmic success is separated from authority to operate. Seven mission-authorization gates cover source provenance, a verified consequential fact, physical feasibility, bounded uncertainty, N-1 resilience, Incident Lead approval, and an independent Safety Officer co-sign. The simulation cannot issue its evidence package until all seven pass.

The exported package includes the source mode, verified question and answer, assignments, stress results, N-1 action, approval identities, readiness gates, and audit history. Objects are serialized canonically; each audit event includes the previous event hash; and the complete package receives a SHA-256 integrity hash. The package is verified immediately before browser download.

Five separate field-qualification gates remain blocked in this prototype: validated live telemetry, certified electrical interfaces, independent cybersecurity assurance, emergency authority, and supervised field validation. The application therefore displays **FIELD DEPLOYMENT BLOCKED** even after a synthetic simulation is authorized. An integrity hash detects later modification but is not a KMS-backed identity signature.

## OpenAI usage

### GPT-5.6

- `/api/analyze` converts narrative reports into strict, source-linked power contracts.
- `/api/event` converts a narrative disruption into structured mission state.
- `/api/regional-event` converts a fictional inspection note into a supported road restriction.
- `/api/regional-reasoning` asks `gpt-5.6-sol` for exactly three bounded, competing hypotheses and evidence questions, then rejects malformed or invented road states and deterministically adjudicates every valid hypothesis.
- `/api/regional-plan` accepts a versioned regional model, enforces bounded runtime validation, chooses the exact or scalable solver, and returns a deterministic SHA-256 request identity plus route-level constraint evidence.
- `/api/regional-runs` persists authenticated, identity-scoped planning records and version differences.
- `/api/regional-runs/:id/review` and `/audit` enforce assigned independent review and replay the stored hash chain.
- `/api/authority-events/verify` authenticates the receiving operator, verifies a pinned public-key event, atomically rejects replay/stale sequences, and queues only a pending human review.
- `/api/assurance` exposes machine-readable control evidence and independent blocking gates; `/api/health` separates process liveness from operational readiness.
- The reasoning route uses the Responses API with strict Structured Outputs, `store: false`, and high reasoning effort. Reports are explicitly treated as untrusted data rather than instructions.
- The model never performs energy arithmetic, supplies impact metrics, chooses the winning allocation, diagnoses infrastructure, or authorizes dispatch.
- Model confidence is never treated as authority. Hidden chain-of-thought is not displayed or used as evidence; the product shows schema-bound claims, counterevidence, and independently reproduced metrics.
- Every model-backed surface displays whether GPT-5.6 ran live or a transparent deterministic fallback was used.

### Codex

Codex was the primary development collaborator for product framing, architecture, interaction design, React/TypeScript implementation, GPT-5.6 integration, exact optimization, uncertainty testing, disruption logic, automated tests, evaluation documentation, and submission materials.

Human decisions included the social problem, product direction, protected 35% reserve, uncertainty bounds, human-approval boundary, fictional scenario, and final submission authorization.

Before submitting, run `/feedback` in the primary Codex build thread and include its Session ID in the Devpost submission.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local for live GPT-5.6 interpretation.
npm run dev
```

The entire deterministic mission loop remains available without a secret through clearly labeled synthetic fallbacks.

## Test and build

```bash
npm run test:planner
npm run typecheck
npm test
npm run benchmark:reasoning -- 25
```

Tests verify:

- unsafe-plan rejection;
- exact-search plan selection;
- reproducible bounded stress scenarios;
- measured improvement over the greedy baseline;
- zero-violation global re-optimization after a closure;
- exact value-of-information question ranking;
- separation of continuous energy from momentary peak power;
- a two-mission counterfactual reallocation after an adverse answer;
- exact single-vehicle and single-route contingency coverage;
- exact pooled heterogeneous regional delivery;
- deterministic 30-stop scalable planning, hard-limit preservation, bounded-input rejection, and replay identity;
- road weight, capacity, cold-chain, deadline, and shift invariants;
- service-weighted N-1 road criticality;
- exact budget-constrained repair portfolio selection;
- deterministic regional stress and replay;
- strict three-hypothesis reasoning contracts, prompt-injection containment, unsupported-road rejection, human-authority gating, and deterministic counterfactual replay;
- regional plan-diff, audit-chain replay, tamper detection, and unauthenticated-ledger rejection;
- signed authority-event success, post-signature tamper, untrusted issuer, road-scope, expiry, future-time, inconsistent-window, and private-key-material rejection;
- an invariant that fully configured software controls still cannot self-assert certification or field readiness;
- minimum-intervention reserve selection;
- honest certificate failure when no equivalent high-power backup exists;
- independent dual-control authorization;
- deterministic evidence-package hashing and tamper detection;
- fail-closed separation of simulation and field readiness; and
- transparent report and event fallbacks.

## Repository map

- `app/page.tsx` — interactive command center and live evaluation
- `app/api/analyze/route.ts` — GPT-5.6 report interpretation
- `app/api/event/route.ts` — GPT-5.6 disruption interpretation
- `app/api/regional-event/route.ts` — GPT-5.6 regional inspection-note interpretation
- `app/api/regional-reasoning/route.ts` — GPT-5.6 Sol hypothesis generation and bounded reasoning contract
- `app/api/regional-plan/route.ts` — versioned external planning contract and deterministic audit response
- `app/api/regional-runs/` — identity-scoped durable run history, review workflow, and audit verification
- `app/api/authority-events/verify/route.ts` — signed source verification and atomic replay/stale-sequence rejection
- `app/api/assurance/route.ts` and `app/api/health/route.ts` — assurance claims, external gates, liveness, and dependency readiness
- `app/regional-access.tsx` — rural delivery, road-aging, and repair-budget command center
- `lib/planner.ts` — safety kernel, exact optimizer, stress suite, value-of-information ranking, and N-1 preparedness search
- `lib/regional.ts` — exact pooled VRPTW, bounded deterministic multi-start solver, road-graph N-1 analysis, stress suite, and exact repair portfolio
- `lib/regional-reasoning.ts` — strict hypothesis validation, deterministic counterfactual adjudication, and evidence-value ranking
- `lib/regional-contract.ts` — strict versioned request boundary and canonical plan evidence
- `lib/regional-ledger.ts` — plan diff and replayable hash-chain events
- `lib/authority-event.ts` — public-key trust registry, bounded signed event contract, and fail-closed verifier
- `lib/assurance.ts` — code evidence, runtime states, prohibited claims, and independent blocking gates
- `db/schema.ts` and `drizzle/` — D1 run, review, and audit-event schema and migration
- `lib/operations.ts` — readiness gates, dual control, canonical evidence, SHA-256 integrity, and audit-chain verification
- `tests/` — planner, API, build, and rendering checks
- `EVALS.md` — evaluation method, results, and limitations
- `PILOT_READINESS.md` — responsible rollout stages and unmet field gates
- `THREAT_MODEL.md` — assets, trust boundaries, threats, controls, and verification backlog
- `RUNBOOK.md` — supervised simulation procedure, stop conditions, and recovery
- `DEMO_SCRIPT.md` — sub-three-minute video plan
- `SUBMISSION.md` — English submission copy
- `REGIONAL_PRODUCT.md` — target users, data contracts, commercial model, rollout, and product metrics
- `COMPETITIVE_STRATEGY.md` — honest Google/Cainiao comparison and defensibility plan
- `SCALE_ARCHITECTURE.md` — scale architecture, solver tiers, SLO targets, security, and evaluation gates
- `BENCHMARKS.md` — reproducible 100/250-stop synthetic performance fixture and result boundaries
- `REASONING_COUNCIL.md` — Sol reasoning boundary, adjudication algorithm, tests, benchmark, and safety limitations
- `ASSURANCE_CASE.md` — safety claims, evidence, defeaters, and independent gates
- `CERTIFICATION_ROADMAP.md` — ISO, NIST, OWASP, METI, and ISMAP scope and staged evidence plan
- `SECURITY.md` — vulnerability reporting, key boundaries, and current dependency posture
- `DATA_GOVERNANCE.md` — stored data, access, integrity, and prohibited-data boundary

## Honest prototype boundary

Exact enumeration is appropriate for the deliberately small, inspectable demo. The regional engine certifies the modeled six-stop optimum. Larger bounded inputs can use the implemented deterministic heuristic, which reports a feasible result and explicitly leaves the optimality gap unknown; this still does not claim Google-scale routing throughput. The Sol council is not a structural diagnosis, calibrated probability model, signed authority feed, or autonomous agent. Its hypotheses may still be semantically wrong; runtime validation and deterministic re-planning bound the consequences but do not make the source facts true. The emergency contingencies and regional deterioration probabilities are synthetic, not a complete hazard analysis. D1 now provides durable identity-scoped records and a replayable hash chain, but not enterprise tenancy, a KMS signature, trusted timestamps, write-once retention, or non-repudiation. A larger deployment would use validated MILP/CP-SAT or decomposition services and require enterprise identity, signed authority adapters, append-only audit storage, certified telemetry, geographic routing, cybersecurity controls, governance review, field trials, and independent validation.

Every facility, vehicle, report, route, timestamp, and metric in this repository is fictional. Do not input personal data, confidential documents, or real emergency information.

## License

MIT — see [`LICENSE`](./LICENSE).
