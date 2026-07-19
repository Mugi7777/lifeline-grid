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
5. The optimizer evaluates every one of the **60 distinct vehicle allocations**.
6. Each allocation is tested across a deterministic **256-point Halton uncertainty suite** covering demand, state-of-charge, and travel-time variation.
7. A lexicographic objective first protects priority-weighted service, then maximizes scenario success, minimizes priority-weighted arrival, and preserves the worst mobility margin.
8. The selected plan succeeds in all 256 demo scenarios. The nearest-feasible baseline succeeds in 207/256.
9. A human approves the simulated dispatch.
10. GPT-5.6 converts a narrative East Bridge closure into a machine-readable route event. The optimizer rebuilds the whole remaining mission plan and retains 100% scenario success.

## Optimization and safety kernel

For each vehicle–facility pair, the kernel checks:

- route availability;
- connector compatibility;
- maximum output power;
- arrival deadline;
- required service duration; and
- post-mission mobility reserve.

The energy available above the protected reserve is calculated as:

```text
usable kWh = capacity × (SoC − reserve) × efficiency − round-trip travel energy
```

The current exact search enumerates all injective assignments for three facilities and five vehicles: `5 × 4 × 3 = 60` complete allocations. Every allocation is also tested against 256 reproducible low-discrepancy scenarios:

- demand: ±10%;
- state of charge: ±5 percentage points; and
- travel time and travel energy: ±20%.

The selected plan must additionally survive the joint adversarial corner: demand +10%, SoC −5 points, and travel +20%. No hard constraint is relaxed to force a result. See [`EVALS.md`](./EVALS.md) for the reproducible evaluation and limitations.

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
- transparent report and event fallbacks.

## Repository map

- `app/page.tsx` — interactive command center and live evaluation
- `app/api/analyze/route.ts` — GPT-5.6 report interpretation
- `app/api/event/route.ts` — GPT-5.6 disruption interpretation
- `lib/planner.ts` — safety kernel, exact optimizer, and stress suite
- `tests/` — planner, API, build, and rendering checks
- `EVALS.md` — evaluation method, results, and limitations
- `DEMO_SCRIPT.md` — sub-three-minute video plan
- `SUBMISSION.md` — English submission copy

## Honest prototype boundary

Exact enumeration is appropriate for this deliberately small, inspectable demo. A larger deployment would replace enumeration with a validated MILP or min-cost-flow implementation and require certified telemetry, geographic routing, cybersecurity controls, operator access control, emergency-governance review, field trials, and independent safety validation.

Every facility, vehicle, report, route, timestamp, and metric in this repository is fictional. Do not input personal data, confidential documents, or real emergency information.

## License

MIT — see [`LICENSE`](./LICENSE).
