# OpenAI Build Week Submission Copy

## Project name

Lifeline Grid

## Tagline

Keep rural communities connected to essentials—even when roads age or disasters strike.

## Track

Work & Productivity

## Short description

Lifeline Grid is a Regional Access OS for low-density communities. Its Nankai Trough 72H Response Lab turns conflicting hospital, road and drone reports into three falsifiable network worlds with GPT-5.6 Sol, then independently re-plans supplies, mobile power, hospital transfers, drone search and road clearance in every world. The system ranks the one authenticated fact with the largest cross-mission consequence while withholding the model recommendation and keeping human authority required. The same regional twin also supports daily shared delivery and road-aging investment.

## Inspiration

Rural communities face one connected problem in three time scales: daily delivery becomes uneconomic, aging roads threaten access, and disasters expose the same fragile network. Existing systems optimize each organization or route separately. The missing layer is a public-interest regional twin that can prove who loses essential access, coordinate fragmented capacity, prioritize limited infrastructure investment, and preserve human authority.

## What it does

The default Regional Access mode opens on a fictional Japanese district. An exact pooled heterogeneous vehicle-routing solver coordinates a postal EV, refrigerated co-op van, and municipal mixed-use bus across capacity, cold-chain, time-window, shift, and road-weight constraints. All 418 modeled households and 152 modeled vulnerable residents are covered on time in the baseline.

Real operations rarely receive one clean fact. The Sol Reasoning Council treats a conflicting field report as untrusted data and asks `gpt-5.6-sol` for exactly three competing road states, evidence for and against each, and the smallest decision-changing question. A strict runtime boundary rejects invented road IDs and malformed restrictions. Lifeline then independently re-plans all three worlds, evaluates 12,288 candidate assignments, 192 stress scenarios, and 36 N-1 road cases, and ranks authenticated authority status first. In the built-in synthetic conflict, that fact separates a world with no access loss from one exposing 64 households and 32 vulnerable residents. The model recommendation stays withheld behind a human-authority gate.

GPT-5.6 then converts a fictional road inspection note into a supported segment restriction. Deterministic code removes that segment and solves the whole regional plan again. The system shows that the modeled North Forest Road loss makes 64 households and 32 vulnerable residents miss the service threshold while both critical deliveries remain protected.

Lifeline breaks all twelve modeled roads one at a time and ranks them by expected access loss—not only traffic or physical condition. A budget slider drives an exact repair-portfolio search across every eligible combination and shows the maximum modeled access-risk reduction within budget. Every figure is a reproducible synthetic result.

The operator can record a synthetic plan in a durable decision ledger. The server recomputes the result, compares it with its predecessor, binds it to the signed-in creator, and optionally assigns a different reviewer. The creator cannot approve their own plan. Every lifecycle change extends a linked audit history that the server replays before reporting verification.

The operator can then switch to Emergency Grid mode, where the same product coordinates mobile batteries through the original verified mission loop.

The demo begins with three fictional reports from a clinic, shelter, and water station. GPT-5.6 extracts strict power contracts with source quotes and explicit assumptions.

A plausible nearby candidate sends E-12 to the clinic. Lifeline Grid blocks it because required duration and the protected 35% post-mission mobility reserve fail.

Before choosing a plan, the Decision-Critical Planner asks a different question: which missing fact could actually change the dispatch? It evaluates three operator-defined uncertainties, both answers to each, the provisional allocation, all 60 answer-specific allocations, and all 256 stress scenarios—93,696 counterfactual plan-scenario evaluations. It ranks the water-station pump surge first. If a 6.5 kW start-up peak reaches the vehicle, guessing wrong produces 226/256 violation scenarios. Asking first changes two missions and restores 256/256.

After the operator confirms the fact, the optimizer evaluates every one of the 60 distinct assignments of five vehicles to three facilities. Each plan is tested across a reproducible 256-point Halton suite covering demand ±10%, SoC ±5 points, and travel ±20%—15,360 plan-scenario evaluations. The nearest-feasible baseline succeeds in 207/256 synthetic scenarios. The selected Lifeline plan succeeds in 256/256 and survives the joint adversarial bound.

That robust plan still hides two discrete single points: losing E-07 or closing River Road can expose clinic service. Lifeline tests three preparedness actions against five vehicle losses and seven corridor closures, re-running the exact allocation and 256-scenario suite each time—414,720 additional plan-scenario evaluations. Without preparation, 10/12 cases protect critical service. Minimum-intervention selection stages idle E-32 at West Relay and raises the result to 12/12. If the verified 6.5 kW adverse pump peak has no equivalent backup, the interface refuses to claim the certificate.

An Incident Lead approves the simulated scope, but that is still insufficient. A distinct Safety Officer must independently co-sign. Lifeline then unlocks a portable canonical-JSON evidence package containing the machine proofs, approvals, readiness gates, and a SHA-256 hash-chained audit history. Five field-qualification gates remain visibly blocked, so simulation authorization is never misrepresented as real deployment approval.

When a fictional free-text update reports that East Bridge has closed, GPT-5.6 converts it into structured route state. Lifeline Grid rebuilds the complete remaining allocation: E-21 changes missions and E-44 takes the water station through Ridge Bypass while preserving full stress-suite success.

The Nankai Trough 72H Response Lab uses one synthetic Kochi coastal network to coordinate four coupled missions: scarce supplies through min-cost flow, mobile power through exact lexicographic assignment, deadline-bounded hospital-transfer proposals, and drone-search prioritization. GPT-5.6 Sol turns conflicting reports into exactly three distinct, schema-bound road worlds while preserving evidence, counterevidence and assumptions. Deterministic code then re-plans every mission in all three worlds. The fixture spans 50.2%–81.0% weighted supply coverage, one to zero critical-power gaps, and zero to two ground-transfer plans. It evaluates 615 exact assignment candidates and ranks authenticated end-to-end status of one coastal road as the highest-value evidence: a 30.8-point supply swing plus changes in power, transfer and isolation. Sol supplies none of those numbers.

The operator may inspect a world on the map, but no model world is applied automatically. The lab also replays every blocked or unknown corridor as a single clearance counterfactual. Unknown roads fail closed, while patient triage, hospital acceptance, road opening, dispatch, switching, drone launch and aircraft tasking remain human-only.

## How we built it

- GPT-5.6 Responses API with strict Structured Outputs for inspection notes, incidents, and disruptions
- Explicit `gpt-5.6-sol` high-reasoning council for competing hypotheses, counterevidence, and decision-changing evidence acquisition
- A second domain-specific `gpt-5.6-sol` council for exactly three Nankai disaster worlds, strict supported-road validation, and multi-mission deterministic adjudication
- Runtime hypothesis validation and deterministic three-world adjudication
- React and TypeScript command-center interface
- Exact pooled heterogeneous VRPTW for the inspectable regional scenario
- Service-weighted road-graph N-1 analysis
- Exact budget-constrained repair portfolio selection
- Fail-closed Nankai routing, commodity min-cost flow, exact power/medical/drone matching, and single-corridor counterfactual replay
- Deterministic regional demand and travel stress testing
- Authenticated D1 decision ledger with predecessor diffs and assigned review
- Server-side audit-chain replay and self-approval prevention
- Deterministic physical safety kernel
- Exact counterfactual value-of-information question ranking
- Separate continuous-energy and momentary peak-power constraints
- Exact lexicographic allocation search
- Deterministic low-discrepancy uncertainty testing
- Exact N-1 vehicle/corridor contingency search
- Minimum-intervention reserve-action selection
- Independent Incident Lead and Safety Officer authorization
- Canonical evidence package, SHA-256 integrity, and hash-chained audit events
- Fail-closed simulation-versus-field readiness gates
- Automated unit, API, rendering, and production-build tests
- Codex as the primary development collaborator

## How GPT-5.6 is meaningfully used

GPT-5.6 handles three language-to-state transitions: a fictional inspection note becomes a supported regional road event, inconsistent incident reports become source-linked power contracts, and an operational disruption becomes a blocked-route event. GPT-5.6 Sol performs two meaningful uncertainty tasks. In Regional Access it constructs three competing interpretations of one road report. In the Nankai lab it constructs three materially distinct multi-road disaster worlds, retains counterevidence and assumptions, and proposes what an authorized operator should verify next. Strict schemas and allowlists reject invented roads and duplicate worlds. Deterministic kernels—not the model—re-plan each world and rank the resulting access swing. The model never diagnoses a structure, performs safety arithmetic, supplies impact metrics, selects the optimal plan, or authorizes dispatch. Hidden chain-of-thought is not treated as evidence.

## How Codex was used

Codex helped turn the initial social-problem thesis into a working end-to-end product: product framing, architecture, interface design, React implementation, GPT-5.6 integration, safety equations, exact optimization, uncertainty suite, disruption loop, tests, evaluation documentation, README, submission copy, and demo script. The human retained authority over the problem choice, 35% reserve policy, uncertainty bounds, approval boundary, fictional scenario, and submission.

**Codex Session ID:** `[insert /feedback Session ID from the primary build thread]`

## Technical implementation

For each vehicle–facility pair, the kernel verifies route, connector, output, arrival deadline, required duration, and post-mission mobility reserve. It computes usable energy above the reserve after round-trip travel.

Before dispatch, the value-of-information engine tests every fictional question answer by stress-testing the provisional allocation, globally re-optimizing all assignments, and measuring avoidable failure scenarios. A guessed assumption can never authorize dispatch. Continuous average load and momentary start-up peak are evaluated independently, so peak-power risk is not incorrectly converted into hours of energy use.

For this inspectable five-vehicle/three-facility demo, the optimizer enumerates all 60 injective assignments, scores them lexicographically, tests each against 256 deterministic Halton scenarios, and checks the selected plan at the joint worst-case corner. Because every complete allocation is considered, the optimum is certified for the stated synthetic model.

The N-1 layer enumerates three preparedness actions and 12 single failures. Every vehicle-loss recovery considers all 24 remaining allocations; every route-loss recovery considers all 60. Critical service must pass all 256 uncertainty scenarios. Actions are ranked by contingency coverage, worst critical success, then a transparent fictional intervention-burden score.

The Operational Trust Layer evaluates seven mission-authorization gates and five separate field-qualification gates. It rejects same-actor dual approval. Evidence objects are canonicalized before hashing; every audit entry commits to the prior hash; the full package is re-verified before download. Because the current site has only synthetic telemetry, no certified electrical interface, no independent security acceptance, no public authority, and no field trial, it remains field-blocked by design.

Regional plans use a separate hosted decision ledger. The server never trusts a client-supplied result: it validates the bounded request, runs the planner again, stores the canonical request and result, calculates the predecessor diff, and records creator/reviewer events in one D1 batch. Access is limited to the creator and exact assigned reviewer. The linked SHA-256 history detects accidental or unsophisticated tampering; it is not a digital signature or legal non-repudiation mechanism.

## Accomplishments

- One product connects daily logistics, road-aging investment, and emergency continuity.
- Conflicting reports become three bounded, falsifiable worlds rather than one persuasive answer.
- All three worlds are independently re-planned across 12,288 candidate assignments, 192 stress scenarios, and 36 N-1 road cases.
- The model recommendation remains withheld while one authenticated evidence request is ranked by a 64-household and 32-vulnerable-resident decision swing.
- An inspectable exact search covers all 418 modeled households and 152 vulnerable residents in the baseline.
- Every modeled road is removed and the complete regional delivery problem is solved again.
- The highest-impact modeled closure exposes 64 households and 32 vulnerable residents without hiding the gap.
- Every eligible repair portfolio is evaluated under the selected public budget.
- Critical service remains a lexicographic objective ahead of distance or modeled emissions.
- A saved plan is recomputed on the server, compared with its predecessor, and bound to the signed-in creator.
- The assigned reviewer must be a different identity, and the audit history is verified by server-side replay.

- A persuasive unsafe plan is visibly rejected.
- The optimization result is compared with a real baseline inside the product.
- The selected plan improves synthetic scenario success from 80.9% to 100%.
- A narrative road closure becomes machine state through GPT-5.6.
- The whole remaining plan is re-optimized instead of patching one route.
- Three uncertainty probes are ranked through 93,696 exact counterfactual evaluations.
- One operator answer prevents 226 bounded-scenario failures if the adverse pump peak is real.
- The adverse answer changes two missions while preserving 100% bounded-scenario success.
- Exact N-1 search detects two single points hidden inside an otherwise 100%-robust plan.
- A minimum-burden reserve action improves modeled critical recovery from 10/12 to 12/12 cases.
- The certificate is withheld when an adverse peak leaves no equivalent backup.
- One actor cannot satisfy both authorization roles.
- Any later evidence or plan change invalidates the exported package hash.
- The interface keeps real field deployment blocked despite a fully authorized simulation.
- Sol generates three bounded Nankai worlds while deterministic software reproduces a 30.8-point supply swing, one critical-power-gap swing, two ground-transfer-plan swing, and three air-request swing.
- The highest-value evidence is ranked from 615 exact assignment candidates across all three worlds; no model world is applied automatically.

## What we learned

AI is most trustworthy when roles are explicit. Language models translate human reports into structured state. Deterministic optimization handles hard physical constraints. Value-of-information finds the fact that matters. N-1 analysis catches discrete failure modes. Dual control and verifiable evidence prevent a mathematically safe-looking answer from silently becoming operational authority.

## What is next

This is a synthetic demonstration, not a production logistics, infrastructure, or emergency product. A responsible next phase would validate the workflow with municipal road managers, logistics operators, emergency planners, and energy specialists; replace bounded heuristics with a validated solver portfolio at fleet scale; and develop certified adapters for authoritative roads, telemetry, routing, organization access control, incident systems, and cybersecurity. The current identity-scoped ledger would need tenant isolation, KMS-backed signatures, retention policy, recovery evidence, and independent security review. No real-world control would be enabled without governance, field testing, and local authorization.

## Safety and data statement

Every facility, vehicle, report, route, timestamp, and metric is fictional. Evaluation figures are reproducible results for the built-in scenario, not claims of field performance. The application does not control real vehicles or facilities and must not be used for real emergency decisions.

## Suggested submission assets

1. Nankai Sol Disaster Council input and `SOL LIVE` badge
2. Three world cards showing the 50.2%–81.0% supply range
3. Highest-evidence gate with the 30.8-point multi-mission swing
4. Real basemap while inspecting H1 and H3 without applying either
5. Road-clearance counterfactual and four mission cards
6. Field-operation blocked gate and deterministic proof strip
7. Regional Access daily-logistics and road-aging mode as the reusable-twin extension
8. Public video following `DEMO_SCRIPT.md`
