# OpenAI Build Week Submission Copy

## Project name

Lifeline Grid

## Tagline

Resolve the fact that changes the emergency-power plan—before moving the fleet.

## Track

Work & Productivity

## Short description

Lifeline Grid combines GPT-5.6 Sol uncertainty reasoning with exact, physics-aware optimization for emergency mobile power. Sol turns one conflicting incident report into exactly three falsifiable worlds. Deterministic code independently re-plans and stress-tests every world, ranks the one authenticated fact with the largest consequence, and keeps the model recommendation behind human authority. A second Regional Access product extends the architecture to rural delivery and aging-road investment.

## Inspiration

During an outage, a clinic or water station can lose power while large batteries sit inside nearby electric vehicles. Coordinating those batteries is not only a routing problem. Reports arrive incomplete and contradictory; a plausible assignment can miss a connector, start-up-power limit, arrival deadline, energy duration or the reserve needed to keep the vehicle mobile.

A chatbot can choose a persuasive story. Emergency workers need a system that shows what changes if that story is wrong, proves every physical consequence, asks for the one fact worth verifying first, and refuses to turn model confidence into authority.

## What it does

Emergency Power opens on a real OpenStreetMap basemap with an explicitly fictional Kochi exercise: five mobile batteries and three power needs at a clinic, shelter and water station. The report contains three conflicts: whether East Bridge is restricted, whether the only 7.2 kW asset is available, and whether the water-pump start-up peak is capped at 4.2 kW or reaches 6.5 kW.

Clicking **Run Sol Power Council** sends that untrusted report to `gpt-5.6-sol` at high reasoning effort. A strict Structured Outputs contract requires exactly three materially distinct worlds, evidence for and against each, explicit assumptions, and one to three field-evidence requests. The model may use only registered route IDs, vehicle IDs and the two modeled peak states. Runtime validation rejects invented state, duplicate worlds and malformed output.

Sol does not calculate an outcome. Lifeline independently runs its exact optimizer in all three worlds. The fallback fixture evaluates:

- 144 exact assignment candidates;
- 768 deterministic Halton stress worlds; and
- 36,864 candidate-plan/scenario pairs.

H1 and H2 preserve twelve critical site-hours and zero critical energy gap. H3 closes East Bridge, loses E-44 and applies the adverse 6.5 kW peak; it preserves only eight critical site-hours and exposes 16.8 kWh. Full-mission stress success spans 100% to 0%. These are deterministic fictional results, not numbers supplied by the model.

The counterfactual evidence-value engine then asks which verifiable fact actually separates the outcomes. It ranks an authenticated pump start-up reading first because it changes four critical site-hours, 16.8 kWh of unserved critical energy and 100 percentage points of full-mission success. The model recommendation is explicitly withheld pending evidence.

A human can inspect H1, H2 or H3 on the map. The route, available fleet, assignments, service gaps and SoC trajectories change, but the action is labeled inspection only. No world is applied automatically.

Every assignment exposes six deterministic checks:

1. modeled route availability;
2. V2L/V2H connector compatibility;
3. momentary maximum output power;
4. arrival deadline;
5. continuous service duration; and
6. protected post-mission mobility reserve.

Average energy and momentary start-up power are calculated independently. The UI also compares the exact result with a deterministic greedy/nearest baseline on the same state.

The N-1 engine removes each of five vehicles and seven modeled routes, then compares three preparedness actions. It re-runs 414,720 plan/scenario evaluations. In the nominal fixture, the exact minimum-intervention search stages E-32 at West Relay and raises critical protection from 10/12 to 12/12 single failures.

An Incident Lead can confirm only the synthetic exercise scope. A distinct Safety Officer must independently co-sign before Lifeline downloads a canonical JSON package containing the complete council, all deterministic outcomes, boundaries and a SHA-256 digest. The UI continues to declare **FIELD OPERATION BLOCKED** because a tabletop check is not emergency authority, authenticated telemetry, road validation, electrical certification or a field trial.

The second product, **Regional Access**, applies the same evidence-first architecture to pooled rural delivery, road-aging impact, repair-budget allocation and Nankai Trough multi-mission tabletop planning. It is accessible from the product switch, but Emergency Power is the primary demo.

## Why it is not a chatbot

```text
conflicting untrusted report
        ↓
GPT-5.6 Sol: exactly three falsifiable worlds
        ↓ strict allowlist + runtime validation
exact assignment + physical constraints in every world
        ↓
768 bounded stress worlds · 36,864 plan/world tests
        ↓
counterfactual evidence-value ranking
        ↓
human inspection · model recommendation withheld
        ↓
N-1 hardening · 414,720 additional tests
        ↓
independent dual control · SHA-256 evidence
        ↓
field operation remains blocked
```

The model reasons about ambiguity. Deterministic software owns every displayed consequence. Humans own evidence and authority.

## How we built it

- `gpt-5.6-sol` through the Responses API with high reasoning effort, `store: false` and strict Structured Outputs
- explicit prompt-injection boundary: incident reports are treated as untrusted data, never instructions
- allowlisted, versioned three-world contract plus runtime validation
- exact lexicographic injective assignment search
- independent continuous-energy and momentary-peak constraints
- six physical and operational checks per assignment
- deterministic 256-point Halton demand/SoC/travel stress suite
- counterfactual value-of-information evidence ranking
- exact N-1 vehicle/route contingency search and minimum-intervention selection
- greedy baseline comparison and visible solver evidence
- real OpenStreetMap basemap with clearly disclosed synthetic operational overlay
- canonical SHA-256 council evidence and two-role exercise gate
- React, TypeScript, Vinext and Cloudflare-hosted ChatGPT Sites
- automated unit, API, production-render and build verification
- Codex as the primary development collaborator

## Meaningful GPT-5.6 Sol use

`/api/emergency-reasoning` asks Sol to do work that deterministic rules cannot do well: separate a contradictory natural-language report into three coherent but falsifiable interpretations, retain counterevidence, expose assumptions, and frame the smallest evidence requests that distinguish those worlds.

The boundary is equally important. Sol cannot invent a route or asset, calculate energy or success, pick a dispatch, certify equipment, diagnose a road, apply a world or authorize action. Strict validation runs before the exact kernel. The model recommendation always remains `withheld_pending_evidence`. Hidden chain-of-thought is not displayed or treated as evidence.

If a funded API key is unavailable or the response fails validation, the product uses a visibly labeled deterministic fixture. It never silently presents fallback text as a live model result.

## How Codex was used

Codex was the primary development collaborator across product framing, architecture, interaction design, React/TypeScript implementation, GPT-5.6 Sol integration, strict contracts, exact algorithms, stress and N-1 evaluation, safety gates, tests, benchmark, README, submission copy and video script.

The human retained authority over the social problem, product direction, fictional scenario, 35% mobility reserve policy, uncertainty bounds, safety boundary and final submission.

**Codex Session ID:** `[insert /feedback Session ID from the primary build thread]`

## Accomplishments

- One click produces three falsifiable worlds instead of one persuasive answer.
- All three worlds are independently re-planned; the model supplies no impact number.
- 144 exact candidates × 256 deterministic stress states produce 36,864 auditable plan/world evaluations.
- One authenticated fact is ranked by a reproduced 16.8 kWh gap, four critical site-hours and a 100-point mission-success swing.
- H2 remains feasible through a whole-plan reassignment; H3 visibly exposes the failed 6.5 kW peak constraint.
- Every assignment shows its route, connector, power, deadline, duration, reserve and SoC proof.
- Exact N-1 search improves synthetic protection from 10/12 to 12/12 through a minimum modeled intervention.
- No Sol world is applied automatically and the model recommendation stays withheld.
- Dual-control exercise evidence never removes the field-operation block.
- The main screen uses a real map while clearly separating real geography from fictional operations.

## What is next

This release implements a bounded exact pilot, not Google-scale traffic, production SRE maturity or safety certification. The scale path is a solver portfolio: exact search for small auditable incidents, constraint/MIP solvers for medium deployments, and decomposition plus large-neighborhood search with warm starts for large fleets. Production also requires authoritative road/fleet/facility adapters, offline incident operation, tenant isolation, KMS-backed identity, observability, multi-region recovery, independent cybersecurity review, supervised exercises and applicable certification.

No real-world actuation will be enabled merely because the software finds a feasible plan.

## Safety and data statement

Every facility, vehicle, route, report, operational position and result is fictional. OpenStreetMap supplies only the real basemap. The application is not navigation, road diagnosis, electrical certification, dispatch, incident command or autonomous control. All metrics are reproducible fixture results, not field-performance claims.

## Suggested submission assets

1. Hero and real map with the real/synthetic disclosure
2. `GPT-5.6 SOL LIVE` plus the three H1/H2/H3 cards
3. Highest-value evidence showing the 16.8 kWh and 100-point swing
4. H2 versus H3 map inspection and the failed peak-power check
5. Greedy versus exact result and the computation proof strip
6. N-1 result changing 10/12 → 12/12
7. Dual-control evidence download with **FIELD OPERATION BLOCKED** visible
8. Public video following `DEMO_SCRIPT.md`
