# OpenAI Build Week Submission Copy

## Project name

Lifeline Grid

## Tagline

Turn stranded mobile batteries into a safety-verified emergency grid.

## Track

Work & Productivity

## Short description

Lifeline Grid is an AI emergency-power command center for a fictional disaster scenario. GPT-5.6 converts narrative reports and disruption updates into source-linked machine state. An exact multi-objective optimizer then proves which mobile batteries can serve each facility, stress-tests every allocation under bounded uncertainty, requires human approval, and globally re-optimizes when a bridge closure invalidates the mission plan.

## Inspiration

Communities can face a paradox after an outage: critical facilities have no power while large batteries remain parked nearby. The missing layer is not another chatbot. It is trustworthy coordination that can interpret messy reports, respect physics, quantify fragility, preserve human authority, and adapt when conditions change.

## What it does

The demo begins with three fictional reports from a clinic, shelter, and water station. GPT-5.6 extracts strict power contracts with source quotes and explicit assumptions.

A plausible nearby candidate sends E-12 to the clinic. Lifeline Grid blocks it because required duration and the protected 35% post-mission mobility reserve fail.

The optimizer then evaluates every one of the 60 distinct assignments of five vehicles to three facilities. Each plan is tested across a reproducible 256-point Halton suite covering demand ±10%, SoC ±5 points, and travel ±20%—15,360 plan-scenario evaluations. The nearest-feasible baseline succeeds in 207/256 synthetic scenarios. The selected Lifeline plan succeeds in 256/256 and survives the joint adversarial bound.

A human approves the simulated dispatch. When a fictional free-text update reports that East Bridge has closed, GPT-5.6 converts it into structured route state. Lifeline Grid rebuilds the complete remaining allocation: E-21 changes missions and E-44 takes the water station through Ridge Bypass while preserving full stress-suite success.

## How we built it

- GPT-5.6 Responses API with strict Structured Outputs for incident and disruption interpretation
- React and TypeScript command-center interface
- Deterministic physical safety kernel
- Exact lexicographic allocation search
- Deterministic low-discrepancy uncertainty testing
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

For this inspectable five-vehicle/three-facility demo, the optimizer enumerates all 60 injective assignments, scores them lexicographically, tests each against 256 deterministic Halton scenarios, and checks the selected plan at the joint worst-case corner. Because every complete allocation is considered, the optimum is certified for the stated synthetic model.

## Accomplishments

- A persuasive unsafe plan is visibly rejected.
- The optimization result is compared with a real baseline inside the product.
- The selected plan improves synthetic scenario success from 80.9% to 100%.
- A narrative road closure becomes machine state through GPT-5.6.
- The whole remaining plan is re-optimized instead of patching one route.
- Human approval remains mandatory.

## What we learned

AI is most trustworthy when roles are explicit. Language models are excellent at translating human reports into structured state. Deterministic optimization is better for hard physical constraints. Evaluation is necessary to distinguish a robust plan from one that merely works at nominal values. Humans must retain authority over consequential action.

## What is next

This is a small synthetic demonstration, not an emergency product. A responsible next phase would validate the workflow with emergency planners and energy specialists, replace enumeration with a validated MILP or min-cost-flow implementation at fleet scale, and develop certified adapters for telemetry, routing, access control, incident systems, and cybersecurity. No real-world control would be enabled without governance, independent validation, field testing, and local authorization.

## Safety and data statement

Every facility, vehicle, report, route, timestamp, and metric is fictional. Evaluation figures are reproducible results for the built-in scenario, not claims of field performance. The application does not control real vehicles or facilities and must not be used for real emergency decisions.

## Suggested submission assets

1. Opening command center
2. E-12 blocked by duration and reserve checks
3. Exact-search proof and 80.9% vs 100% benchmark
4. Human-approved mission state
5. GPT-5.6 event evidence and global re-plan
6. Public video following `DEMO_SCRIPT.md`
