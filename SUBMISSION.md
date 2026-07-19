# OpenAI Build Week Submission Copy

## Project name

Lifeline Grid

## Tagline

Turn stranded mobile batteries into a safety-verified emergency grid.

## Track

Work & Productivity

## Short description

Lifeline Grid is an AI power command center for a fictional disaster-response scenario. GPT-5.6 converts narrative incident reports into source-linked power contracts. A deterministic planner then proves which mobile batteries can safely serve each facility while enforcing connector, output, travel, deadline, duration, and mobility-reserve constraints. A human approves the simulated dispatch, and the system automatically re-plans when a bridge closure invalidates the route.

## Inspiration

Communities can face a paradox after an outage: critical facilities have no power while large batteries remain parked nearby. The missing layer is not another chatbot. It is a trustworthy coordination system that can interpret messy reports, respect physical reality, preserve human authority, and adapt when conditions change.

## What it does

The demo begins with three fictional reports from a clinic, shelter, and water station. GPT-5.6 extracts machine-readable power, duration, deadline, priority, connector, confidence, source quote, and assumptions.

A plausible candidate assigns the nearby E-12 battery to the clinic. Lifeline Grid blocks it because the battery covers only about 1.2 of the required 8 hours and violates a protected 35% post-mission mobility reserve. The deterministic planner finds a zero-violation alternative, a human approves the simulated dispatch, and the mission state becomes auditable.

When the fictional East Bridge closes, the original water-station route becomes invalid. Lifeline Grid re-runs the hard constraints and replaces E-21 with E-44 via Ridge Bypass, retaining full critical coverage.

## How we built it

- GPT-5.6 Responses API with strict Structured Outputs for report extraction
- React and TypeScript command-center interface
- Deterministic energy, routing, compatibility, deadline, and reserve calculations
- Persistent in-session mission state and human approval boundary
- Automated tests for unsafe-plan rejection, verified dispatch, and disruption re-planning
- Codex as the primary development collaborator

## How GPT-5.6 is meaningfully used

GPT-5.6 handles the task that benefits from language intelligence: converting inconsistent narrative reports into a strict, source-linked power-need contract while separating facts from assumptions. The model is not used for arithmetic feasibility or authorization. Those responsibilities remain with deterministic code and a human operator.

## How Codex was used

Codex helped turn the initial concept into a working end-to-end product: product thesis, system boundary, interaction design, React implementation, GPT-5.6 integration, safety equations, deterministic planner, route-disruption logic, tests, README, and demo script. The human retained authority over the social problem, safety policy, product direction, fictional scenario, and submission.

## Challenges

The central challenge was making the AI useful without letting it become the safety authority. We separated narrative interpretation from physical feasibility, made failed constraints visible, and required explicit human approval. We also designed a complete disruption loop so the demo does more than answer a prompt.

## Accomplishments

- An unsafe but persuasive plan is visibly rejected.
- A zero-violation plan is generated without relaxing constraints.
- Every fictional vehicle retains the 35% mobility reserve.
- A bridge closure triggers a safe alternate assignment.
- The full product story is understandable in under three minutes.

## What we learned

AI becomes more trustworthy when its role is narrow and legible. Language models are excellent at structuring human reports; deterministic software is better for hard physical constraints; humans must retain authority over consequential actions. The product value comes from connecting those roles into one auditable loop.

## What is next

The prototype uses synthetic data and simulated dispatch only. A responsible next phase would validate the workflow with emergency planners and energy specialists, then develop certified adapters for fleet telemetry, facility interfaces, geographic routing, operator access control, and incident-system integration. No real-world control would be enabled without governance, cybersecurity review, field testing, and local authorization.

## Safety and data statement

All facilities, vehicles, reports, routes, metrics, and timestamps in the submission are fictional. The application does not control real vehicles or facilities and must not be used for real emergency decisions.

## Suggested submission assets

1. Hero image: opening command center
2. Safety image: E-12 blocked with duration and reserve failures
3. Verified image: zero violations and full critical protection
4. Re-plan image: East Bridge closed and E-44 on Ridge Bypass
5. Public video: the 2:45 flow in `DEMO_SCRIPT.md`
