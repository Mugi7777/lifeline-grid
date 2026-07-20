# Lifeline Grid

**Resolve the fact that changes the emergency-power plan—before moving the fleet.**

Lifeline Grid is an OpenAI Build Week 2026 prototype for the **Work & Productivity** track. Its primary product, **Emergency Power**, combines GPT-5.6 Sol uncertainty reasoning with exact, physics-aware optimization to coordinate mobile batteries across conflicting incident reports. The second product, **Regional Access**, applies the same human-authority and evidence principles to rural delivery, road-aging impact and emergency continuity.

> Synthetic simulation only. Lifeline Grid does not control real vehicles, facilities, or emergency operations. Demo metrics are scenario results, not real-world performance claims.

## Emergency Power 2.0

The first viewport is now a real OpenStreetMap basemap with an explicitly synthetic Kochi tabletop. One conflicting report is sent to `gpt-5.6-sol` at high reasoning effort. Sol must return exactly three materially different, falsifiable worlds using only allowlisted routes, vehicles and load states. It preserves evidence, counterevidence and assumptions, but it cannot calculate safety consequences or authorize action.

Deterministic code independently re-plans each world. In the fixture it evaluates **144 exact assignment candidates**, **768 bounded stress worlds** and **36,864 candidate-plan/scenario pairs**. The three outcomes span 12 to 8 critical site-hours, 0 to 16.8 kWh of unserved critical energy, and 100% to 0% full-mission stress success. Counterfactual value-of-information ranks an authenticated pump start-up reading first because it separates that full consequence. Sol supplies none of these numbers.

The map lets a human inspect H1, H2 or H3 without applying any world. Every vehicle assignment exposes route, connector, peak power, deadline, service duration and protected-reserve checks plus its before/after SoC. The UI compares the exact plan with a greedy baseline on the same state. A separate exact N-1 search runs **414,720** more plan/scenario evaluations and selects the minimum modeled intervention that improves critical protection from 10/12 to 12/12 single failures.

The model recommendation is always withheld pending evidence. A synthetic exercise requires Incident Lead confirmation and an independent Safety Officer co-sign before a canonical SHA-256 council package can be downloaded. Field operation remains blocked. See [`EMERGENCY_POWER_2.md`](./EMERGENCY_POWER_2.md) for the contract, algorithms, benchmark and honest scale boundary.

## Regional Access OS · second product

The synthetic Mizunoki District model connects eight locations with twelve roads and coordinates six delivery zones across a postal EV, a refrigerated co-op van, and a municipal mixed-use bus. It evaluates:

- delivery capacity, cold chain, time windows, shifts, and road weight limits;
- every modeled single-road failure;
- households and vulnerable residents losing on-time access;
- exact pooled fleet assignments for the inspectable six-stop scenario;
- a deterministic three-start insertion and 2-opt solver for bounded requests up to 250 demand zones, with no false optimality claim;
- a deterministic 64-scenario demand and travel stress suite; and
- every eligible repair portfolio under an adjustable public budget.

The Regional Access tab uses an interactive OpenStreetMap basemap over real geography in the Gujo mountain area of Gifu. The modeled facilities, demand, condition grades, probabilities, closures, and fleet remain fictional and are visibly labeled as such. Stored route shapes are road-aligned demonstration geometry derived from OpenStreetMap data through OSRM; they are not live traffic, navigation, or road-authority records. Map attribution remains visible at all times. Clicking a modeled road immediately runs the corresponding N-1 scenario and updates the route overlay, access metrics, and capital portfolio.

Authenticated users can explicitly record a plan in a durable D1 decision ledger. The server recomputes the plan, links it to the prior version, stores the operational diff, assigns an optional independent reviewer, and appends SHA-256-linked audit events. The creator cannot approve their own run.

The **Production Trust Plane** adds a versioned signed road-authority envelope. It verifies an ECDSA P-256/SHA-256 signature against a pinned issuer, key ID and road scope; bounds issue, expiry and effective time; and atomically rejects duplicate IDs and stale issuer sequences in D1. A valid event is stored only as `pending` with `human_review_required` and `planningEffect: not_applied`. Cryptographic integrity never becomes road diagnosis or permission to act.

The same plane exposes `/api/assurance` and `/api/health`. It reports software evidence separately from independent gates and always declares this release **not certified / field blocked**. See [`ASSURANCE_CASE.md`](./ASSURANCE_CASE.md), [`CERTIFICATION_ROADMAP.md`](./CERTIFICATION_ROADMAP.md), and [`SECURITY.md`](./SECURITY.md).

The new **Nankai Trough 72H Response Lab** joins scarce supply allocation, mobile-power staging, deadline-bounded hospital-transfer planning, drone-search prioritization, and road-clearance counterfactuals on one synthetic Kochi coastal state. Its **Sol Disaster Reasoning Council** uses `gpt-5.6-sol` at high reasoning effort to turn conflicting situation reports into exactly three bounded road-network worlds with evidence, counterevidence and assumptions. Deterministic code then re-plans all four missions in every world and ranks the one human-verifiable fact with the largest consequence. In the fixture, the worlds span 50.2%–81.0% weighted supply coverage, one to zero critical-power gaps, and zero to two ground-transfer plans. The model recommendation is withheld and no world is applied automatically. See [`NANKAI_RESPONSE_LAB.md`](./NANKAI_RESPONSE_LAB.md).

The baseline exact plan covers all 418 modeled households and 152 modeled vulnerable residents on time. Removing North Forest Road makes one community miss its service threshold—64 households and 32 vulnerable residents—while both critical deliveries remain protected. These values are deterministic fictional results.

The new **Regional Scale Proof** makes computational headroom visible instead of asserting it. It deterministically builds a 2,048-zone, 5,481-link sparse network, screens every link, and exactly replays the 64 highest-flow closure candidates with 65 multi-source Dijkstra runs and 711,034 graph relaxations. The UI measures the full calculation on the current runtime, overlays the impact on the real basemap, supports a 512/2,048-zone switch, and exports a replay-oriented JSON evidence file. See [`SCALE_EVALS.md`](./SCALE_EVALS.md) for the algorithm, benchmark command, reproduced p50/p95/p99 results, and non-claims.

The **Operational Data Trust Gateway** now places a fail-closed boundary in front of planning. A strict versioned bundle carries map, road-authority, weather, and fleet feeds. Deterministic policy checks signature status, freshness, validity, regional scope, coverage, missing classes, and conflicts, then selects `verified`, `degraded`, or `quarantined` mode. Five visible failure injections demonstrate that stale, conflicting, tampered, or missing data blocks consequential use. A canonical SHA-256 evidence export binds the bundle to its verdict without exporting source payloads. See [`DATA_TRUST_GATEWAY.md`](./DATA_TRUST_GATEWAY.md).

The **Pilot Data Sandbox** accepts a bounded, de-identified road `FeatureCollection` selected from the user's device and analyzes it entirely in the browser tab. It validates up to 10,000 LineString/MultiLineString features and 200,000 coordinates, constructs a snapped endpoint graph, then uses iterative Tarjan low-link analysis to find graph bridges and articulation points. Every accepted segment is evaluated; ordinary roads are sampled only for map rendering. A SHA-256 evidence export binds the network fingerprint, findings, quality issues, operation counters, and blocked field gate. Local files are always unverified, and crossing/intersection topology is never inferred. See [`PILOT_DATA_SANDBOX.md`](./PILOT_DATA_SANDBOX.md).

The **Portable Twin Capsule** saves the current synthetic closure, repair budget, regional-model identity, expected metrics and route evidence to both browser storage and a downloadable JSON file. Import is bounded and fail-closed: payload integrity, current model identity, plan evidence and deterministic reproduction must all pass before UI state is restored. Snapshots older than 24 hours remain verifiable but are visibly stale. See [`RECOVERY.md`](./RECOVERY.md) for source-code and state-backup instructions.

GPT-5.6 converts a narrative inspection note into a supported road event. The new **Sol Reasoning Council** uses `gpt-5.6-sol` at high reasoning effort to turn conflicting, untrusted reports into exactly three testable road-state hypotheses, preserve counterevidence, and ask for the smallest decision-changing fact. Deterministic code then re-plans every hypothesis, runs 192 stress scenarios and 36 N-1 road cases, and withholds the model recommendation behind a human-authority gate. The model cannot diagnose a road, calculate the consequence, authorize a closure, or authorize dispatch.

See [`REGIONAL_PRODUCT.md`](./REGIONAL_PRODUCT.md) for the product definition and [`COMPETITIVE_STRATEGY.md`](./COMPETITIVE_STRATEGY.md) for the explicit Google/Cainiao build-partner boundary.
See [`SCALE_ARCHITECTURE.md`](./SCALE_ARCHITECTURE.md) for the production control plane, solver portfolio, security model, degraded modes, and measurable service targets.

## Why this is not a chatbot

A chatbot can summarize one report or recommend a plausible vehicle. Emergency Power owns persistent machine state, hard physical constraints, counterfactual worlds, optimization, stress testing, human authority and replay evidence:

```text
Conflicting untrusted reports
      ↓
GPT-5.6 Sol: three competing, falsifiable worlds
      ↓
Strict allowlist + runtime validation
      ↓
Exact re-plan and physical checks in every world
      ↓
768 bounded stress worlds · 36,864 plan/world tests
      ↓
Rank the one authenticated fact with the largest consequence
      ↓
Human inspection only · model recommendation withheld
      ↓
Exact N-1 search · 414,720 additional tests
      ↓
Incident Lead confirmation → independent Safety Officer co-sign
      ↓
SHA-256 council evidence · field operation remains blocked
```

Sol reasons about ambiguity. Deterministic code performs every safety calculation and displays disagreements rather than hiding them. The interface changes inspection state, not real infrastructure state.

## The three-minute mission loop

1. Show the real basemap, three power needs and the nominal verified assignment.
2. Run **Sol Power Council** on the conflicting bridge, vehicle and pump report.
3. Show `SOL LIVE`, the three materially different worlds and their 12 h / 12 h / 8 h critical coverage.
4. Point to the highest-value evidence card: one authenticated peak reading separates a 16.8 kWh gap and 100-point mission swing.
5. Inspect H2, then H3. The map, assignments, failed peak check and SoC change; neither click grants authority.
6. Compare the greedy baseline with the exact stress-tested result.
7. Run N-1 hardening and show 10/12 → 12/12 with the selected reserve action.
8. Record two synthetic exercise roles and download the SHA-256 evidence package while **FIELD OPERATION BLOCKED** remains visible.

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

- `/api/emergency-reasoning` asks `gpt-5.6-sol` at high reasoning effort for exactly three bounded mobile-power worlds and one to three evidence requests. Strict validation rejects invented routes/assets, malformed IDs and duplicate states; deterministic code then re-plans and stress-tests every world and withholds the model recommendation.
- `/api/analyze` converts narrative reports into strict, source-linked power contracts.
- `/api/event` converts a narrative disruption into structured mission state.
- `/api/regional-event` converts a fictional inspection note into a supported road restriction.
- `/api/regional-reasoning` asks `gpt-5.6-sol` for exactly three bounded, competing hypotheses and evidence questions, then rejects malformed or invented road states and deterministically adjudicates every valid hypothesis.
- `/api/nankai-reasoning` asks `gpt-5.6-sol` for three materially distinct disaster-network worlds, counterevidence and evidence requests; strict validation rejects invented roads or duplicate worlds, then the Nankai kernel independently re-plans every mission and withholds the model recommendation.
- `/api/regional-plan` accepts a versioned regional model, enforces bounded runtime validation, chooses the exact or scalable solver, and returns a deterministic SHA-256 request identity plus route-level constraint evidence.
- `/api/regional-runs` persists authenticated, identity-scoped planning records and version differences.
- `/api/regional-runs/:id/review` and `/audit` enforce assigned independent review and replay the stored hash chain.
- `/api/authority-events/verify` authenticates the receiving operator, verifies a pinned public-key event, atomically rejects replay/stale sequences, and queues only a pending human review.
- `/api/data-trust` strictly validates a bounded multi-source operational bundle, applies freshness, scope, coverage, declared-integrity and conflict policy against server time, emits canonical evidence, persists nothing, and always blocks consequential review because the public caller is not an authenticated adapter.
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

## Save your own backup

Download the current source directly from [GitHub as a ZIP](https://github.com/Mugi7777/lifeline-grid/archive/refs/heads/main.zip), then keep another copy outside GitHub. Hosted secrets and database contents are intentionally excluded. Detailed restore and verification instructions are in [`RECOVERY.md`](./RECOVERY.md).

## Test and build

```bash
npm run test:planner
npm run typecheck
npm test
npm run benchmark:reasoning -- 25
npm run benchmark:scale -- 10
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
- deterministic 512- and 2,048-zone sparse graph generation, full link screening, exact top-corridor replay, bounded topology and stable fingerprints;
- deterministic 30-stop scalable planning, hard-limit preservation, bounded-input rejection, and replay identity;
- road weight, capacity, cold-chain, deadline, and shift invariants;
- service-weighted N-1 road criticality;
- exact budget-constrained repair portfolio selection;
- complete, bounded geographic coverage for every modeled node and road plus the real/synthetic disclosure contract;
- deterministic regional stress and replay;
- strict three-hypothesis reasoning contracts, prompt-injection containment, unsupported-road rejection, human-authority gating, and deterministic counterfactual replay;
- regional plan-diff, audit-chain replay, tamper detection, and unauthenticated-ledger rejection;
- signed authority-event success, post-signature tamper, untrusted issuer, road-scope, expiry, future-time, inconsistent-window, and private-key-material rejection;
- an invariant that fully configured software controls still cannot self-assert certification or field readiness;
- verified, stale, conflicting, tampered, and missing-feed data-trust modes; strict bundle rejection; and deterministic SHA-256 evidence binding;
- bounded local GeoJSON acceptance, per-feature isolation, duplicate and malformed topology rejection, exact bridge/articulation results for chains, cycles, and parallel roads, deterministic evidence binding, and a non-recursive 10,000-segment worst-case chain;
- portable-twin round trips, closure and repair-budget restoration, stale-state disclosure, model mismatch, future timestamps, outer-digest tamper, and deterministic plan-evidence rejection;
- deterministic Nankai 0–6 hour, 24 hour and 72 hour response states; min-cost supply flow; exact power, medical and drone assignments; fail-closed routes; road-clearance counterfactual benefit; invalid-state rejection; and replay digest stability;
- strict Nankai Sol three-world contracts, unsupported-road and duplicate-world rejection, prompt-injection containment, deterministic multi-mission adjudication, highest-value authority evidence ranking, no automatic world application, and fail-closed routes in every hypothesis;
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
- `app/api/nankai-reasoning/route.ts` — GPT-5.6 Sol disaster-world generation, strict Structured Outputs, transparent fallback, and performance evidence
- `app/api/regional-plan/route.ts` — versioned external planning contract and deterministic audit response
- `app/api/regional-runs/` — identity-scoped durable run history, review workflow, and audit verification
- `app/api/authority-events/verify/route.ts` — signed source verification and atomic replay/stale-sequence rejection
- `app/api/data-trust/route.ts` — strict operational-feed ingestion and provenance evidence
- `app/api/assurance/route.ts` and `app/api/health/route.ts` — assurance claims, external gates, liveness, and dependency readiness
- `app/regional-access.tsx` — rural delivery, road-aging, and repair-budget command center
- `app/nankai-response-lab.tsx` and `app/nankai-response-map.tsx` — synthetic Nankai Trough multi-modal response lab and real-basemap decision overlay
- `app/pilot-data-sandbox.tsx` and `app/pilot-network-map.tsx` — local-file pilot workflow, quality gates, evidence export, and real-basemap topology rendering
- `lib/planner.ts` — safety kernel, exact optimizer, stress suite, value-of-information ranking, and N-1 preparedness search
- `lib/regional.ts` — exact pooled VRPTW, bounded deterministic multi-start solver, road-graph N-1 analysis, stress suite, and exact repair portfolio
- `lib/regional-reasoning.ts` — strict hypothesis validation, deterministic counterfactual adjudication, and evidence-value ranking
- `lib/regional-contract.ts` — strict versioned request boundary and canonical plan evidence
- `lib/regional-ledger.ts` — plan diff and replayable hash-chain events
- `lib/authority-event.ts` — public-key trust registry, bounded signed event contract, and fail-closed verifier
- `lib/data-trust.ts` — source-class policy, freshness/scope/coverage/conflict evaluation, degraded modes, and canonical evidence
- `lib/pilot-data-sandbox.ts` — bounded GeoJSON normalization, iterative bridge/articulation analysis, deterministic ranking, and evidence generation
- `lib/continuity-capsule.ts` — bounded portable state, SHA-256 evidence, deterministic restore verification, and stale-state disclosure
- `lib/assurance.ts` — code evidence, runtime states, prohibited claims, and independent blocking gates
- `lib/nankai-response.ts` — fail-closed routing, min-cost supply flow, exact power/medical/drone assignments, road-clearance replay, and evidence export
- `lib/nankai-reasoning.ts` — strict three-world validation, deterministic multi-mission adjudication, consequence range, and evidence-value ranking
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
- `DATA_TRUST_GATEWAY.md` — operational feed contract, failure modes, evidence and pilot boundary
- `PILOT_DATA_SANDBOX.md` — local GeoJSON contract, algorithm, privacy boundary, tabletop protocol, and unmet pilot gates
- `RECOVERY.md` — GitHub/ZIP source backup, restore verification, portable twin state, and remaining recovery gaps
- `NANKAI_RESPONSE_LAB.md` — public-source basis, algorithms, reproduced results, safety authority boundary, and shadow-pilot gaps
- `BUILD_WEEK_FINAL_CHECKLIST.md` — submission-ready evidence and the remaining human-controlled tasks

## Honest prototype boundary

Exact enumeration is appropriate for the deliberately small, inspectable demo. The regional engine certifies the modeled six-stop optimum. Larger bounded inputs can use the implemented deterministic heuristic, which reports a feasible result and explicitly leaves the optimality gap unknown; this still does not claim Google-scale routing throughput. The Nankai supply result is an allocation envelope, not a shared-capacity vehicle schedule; its medical and drone results are planning proposals without triage, acceptance, weather, airspace, operator, or dispatch authority. The local GeoJSON sandbox identifies endpoint-graph single points but does not infer crossings, grade separation, passability, structural condition, demand, travel time, or route legality. The Sol council is not a structural diagnosis, calibrated probability model, signed authority feed, or autonomous agent. Its hypotheses may still be semantically wrong; runtime validation and deterministic re-planning bound the consequences but do not make the source facts true. The emergency contingencies and regional deterioration probabilities are synthetic, not a complete hazard analysis. D1 now provides durable identity-scoped records and a replayable hash chain, but not enterprise tenancy, a KMS signature, trusted timestamps, write-once retention, or non-repudiation. A larger deployment would use validated MILP/CP-SAT or decomposition services and require enterprise identity, signed authority adapters, append-only audit storage, certified telemetry, geographic routing, cybersecurity controls, governance review, field trials, and independent validation.

Every facility, vehicle, report, route, timestamp, and metric in this repository is fictional. Do not input personal data, confidential documents, or real emergency information.

## License

MIT — see [`LICENSE`](./LICENSE).
