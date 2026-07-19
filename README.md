# Lifeline Grid

**Turn stranded mobile batteries into a safety-verified emergency grid.**

Lifeline Grid is an OpenAI Build Week 2026 prototype for the **Work & Productivity** track. It converts fictional disaster reports into a human-authorized mobile-power plan, proves the plan against physical constraints and bounded uncertainty, and globally re-optimizes when the fictional world changes.

> Synthetic simulation only. Lifeline Grid does not control real vehicles, facilities, or emergency operations. Demo metrics are scenario results, not real-world performance claims.

## Why this is not a chatbot

A chatbot can summarize a power request. Emergency coordination also requires state, constraints, optimization, authorization, evaluation, and recovery.

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
Machine-checkable plan → Human approval
      ↑                              ↓
      └── GPT-5.6 event → global re-plan ┘
```

GPT-5.6 interprets language. Deterministic code performs safety arithmetic and optimization. A human is the only authority that can approve the simulated dispatch.

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
12. A human approves the simulated dispatch.
13. GPT-5.6 converts a narrative East Bridge closure into a machine-readable route event. The optimizer rebuilds the whole remaining mission plan and retains 100% scenario success.

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

## OpenAI usage

### GPT-5.6

- `/api/analyze` converts narrative reports into strict, source-linked power contracts.
- `/api/event` converts a narrative disruption into structured mission state.
- The model never performs energy arithmetic, chooses the winning allocation, or authorizes dispatch.
- Both endpoints display whether GPT-5.6 ran live or a transparent synthetic fallback was used.

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
npm test
```

Tests verify:

- unsafe-plan rejection;
- exact-search plan selection;
- reproducible bounded stress scenarios;
- measured improvement over the greedy baseline;
- zero-violation global re-optimization after a closure; and
- exact value-of-information question ranking;
- separation of continuous energy from momentary peak power;
- a two-mission counterfactual reallocation after an adverse answer; and
- transparent report and event fallbacks.

## Repository map

- `app/page.tsx` — interactive command center and live evaluation
- `app/api/analyze/route.ts` — GPT-5.6 report interpretation
- `app/api/event/route.ts` — GPT-5.6 disruption interpretation
- `lib/planner.ts` — safety kernel, exact optimizer, stress suite, and value-of-information ranking
- `tests/` — planner, API, build, and rendering checks
- `EVALS.md` — evaluation method, results, and limitations
- `DEMO_SCRIPT.md` — sub-three-minute video plan
- `SUBMISSION.md` — English submission copy

## Honest prototype boundary

Exact enumeration is appropriate for this deliberately small, inspectable demo. A larger deployment would replace enumeration with a validated MILP or min-cost-flow implementation and require certified telemetry, geographic routing, cybersecurity controls, operator access control, emergency-governance review, field trials, and independent safety validation.

Every facility, vehicle, report, route, timestamp, and metric in this repository is fictional. Do not input personal data, confidential documents, or real emergency information.

## License

MIT — see [`LICENSE`](./LICENSE).
