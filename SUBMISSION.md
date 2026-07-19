# OpenAI Build Week Submission Copy

## Project name

Lifeline Grid

## Tagline

Turn stranded mobile batteries into a safety-verified emergency grid.

## Track

Work & Productivity

## Short description

Lifeline Grid is an AI emergency-power command center for a fictional disaster scenario. GPT-5.6 converts narrative reports and disruption updates into source-linked machine state. Deterministic planners then identify the one fact worth checking, prove the allocation under bounded uncertainty, eliminate modeled single points of failure with the minimum preventive action, require human approval, and globally re-optimize when reality changes.

## Inspiration

Communities can face a paradox after an outage: critical facilities have no power while large batteries remain parked nearby. The missing layer is not another chatbot. It is trustworthy coordination that can interpret messy reports, respect physics, quantify fragility, preserve human authority, and adapt when conditions change.

## What it does

The demo begins with three fictional reports from a clinic, shelter, and water station. GPT-5.6 extracts strict power contracts with source quotes and explicit assumptions.

A plausible nearby candidate sends E-12 to the clinic. Lifeline Grid blocks it because required duration and the protected 35% post-mission mobility reserve fail.

Before choosing a plan, the Decision-Critical Planner asks a different question: which missing fact could actually change the dispatch? It evaluates three operator-defined uncertainties, both answers to each, the provisional allocation, all 60 answer-specific allocations, and all 256 stress scenarios—93,696 counterfactual plan-scenario evaluations. It ranks the water-station pump surge first. If a 6.5 kW start-up peak reaches the vehicle, guessing wrong produces 226/256 violation scenarios. Asking first changes two missions and restores 256/256.

After the operator confirms the fact, the optimizer evaluates every one of the 60 distinct assignments of five vehicles to three facilities. Each plan is tested across a reproducible 256-point Halton suite covering demand ±10%, SoC ±5 points, and travel ±20%—15,360 plan-scenario evaluations. The nearest-feasible baseline succeeds in 207/256 synthetic scenarios. The selected Lifeline plan succeeds in 256/256 and survives the joint adversarial bound.

That robust plan still hides two discrete single points: losing E-07 or closing River Road can expose clinic service. Lifeline tests three preparedness actions against five vehicle losses and seven corridor closures, re-running the exact allocation and 256-scenario suite each time—414,720 additional plan-scenario evaluations. Without preparation, 10/12 cases protect critical service. Minimum-intervention selection stages idle E-32 at West Relay and raises the result to 12/12. If the verified 6.5 kW adverse pump peak has no equivalent backup, the interface refuses to claim the certificate.

A human approves the simulated dispatch. When a fictional free-text update reports that East Bridge has closed, GPT-5.6 converts it into structured route state. Lifeline Grid rebuilds the complete remaining allocation: E-21 changes missions and E-44 takes the water station through Ridge Bypass while preserving full stress-suite success.

## How we built it

- GPT-5.6 Responses API with strict Structured Outputs for incident and disruption interpretation
- React and TypeScript command-center interface
- Deterministic physical safety kernel
- Exact counterfactual value-of-information question ranking
- Separate continuous-energy and momentary peak-power constraints
- Exact lexicographic allocation search
- Deterministic low-discrepancy uncertainty testing
- Exact N-1 vehicle/corridor contingency search
- Minimum-intervention reserve-action selection
- Human approval boundary and auditable mission state
- Automated unit, API, rendering, and production-build tests
- Codex as the primary development collaborator

## How GPT-5.6 is meaningfully used

GPT-5.6 handles two language-to-state transitions: inconsistent incident reports become source-linked power contracts, and an operational disruption becomes a blocked-route event. The model never performs safety arithmetic, selects the optimal plan, or authorizes dispatch. This separation makes every consequential number reproducible and inspectable.

## How Codex was used

Codex helped turn the initial social-problem thesis into a working end-to-end product: product framing, architecture, interface design, React implementation, GPT-5.6 integration, safety equations, exact optimization, uncertainty suite, disruption loop, tests, evaluation documentation, README, submission copy, and demo script. The human retained authority over the problem choice, 35% reserve policy, uncertainty bounds, approval boundary, fictional scenario, and submission.

**Codex Session ID:** `[insert /feedback Session ID from the primary build thread]`

## Technical implementation

For each vehicle–facility pair, the kernel verifies route, connector, output, arrival deadline, required duration, and post-mission mobility reserve. It computes usable energy above the reserve after round-trip travel.

Before dispatch, the value-of-information engine tests every fictional question answer by stress-testing the provisional allocation, globally re-optimizing all assignments, and measuring avoidable failure scenarios. A guessed assumption can never authorize dispatch. Continuous average load and momentary start-up peak are evaluated independently, so peak-power risk is not incorrectly converted into hours of energy use.

For this inspectable five-vehicle/three-facility demo, the optimizer enumerates all 60 injective assignments, scores them lexicographically, tests each against 256 deterministic Halton scenarios, and checks the selected plan at the joint worst-case corner. Because every complete allocation is considered, the optimum is certified for the stated synthetic model.

The N-1 layer enumerates three preparedness actions and 12 single failures. Every vehicle-loss recovery considers all 24 remaining allocations; every route-loss recovery considers all 60. Critical service must pass all 256 uncertainty scenarios. Actions are ranked by contingency coverage, worst critical success, then a transparent fictional intervention-burden score.

## Accomplishments

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
- Human approval remains mandatory.

## What we learned

AI is most trustworthy when roles are explicit. Language models are excellent at translating human reports into structured state. Deterministic optimization is better for hard physical constraints. Value-of-information analysis prevents teams from asking every possible question—or guessing the one fact that matters. N-1 analysis catches failure modes that continuous uncertainty testing alone can miss. Humans must retain authority over facts and consequential action.

## What is next

This is a small synthetic demonstration, not an emergency product. A responsible next phase would validate the workflow with emergency planners and energy specialists, replace enumeration with a validated MILP or min-cost-flow implementation at fleet scale, and develop certified adapters for telemetry, routing, access control, incident systems, and cybersecurity. No real-world control would be enabled without governance, independent validation, field testing, and local authorization.

## Safety and data statement

Every facility, vehicle, report, route, timestamp, and metric is fictional. Evaluation figures are reproducible results for the built-in scenario, not claims of field performance. The application does not control real vehicles or facilities and must not be used for real emergency decisions.

## Suggested submission assets

1. Opening command center
2. E-12 blocked by duration and reserve checks
3. Exact-search proof and 80.9% vs 100% benchmark
4. 10/12 → 12/12 N-1 certificate and E-32 reserve action
5. Human-approved mission state
6. GPT-5.6 event evidence and global re-plan
7. Public video following `DEMO_SCRIPT.md`
