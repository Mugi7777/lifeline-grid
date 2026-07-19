# Lifeline Grid

**Verified mobile power coordination for disaster response.**

Lifeline Grid turns fictional incident reports into a safety-verified plan for temporarily assigning mobile batteries to critical facilities. It is an OpenAI Build Week 2026 prototype for the **Work & Productivity** track.

> Synthetic simulation only. Lifeline Grid does not control real vehicles, facilities, or emergency operations.

## The problem

After a regional outage, a community can have both urgent power needs and large batteries sitting inside electric vehicles. Coordinating them is not a chat problem alone. A useful system must preserve live state, prove physical feasibility, protect mobility reserve, require human authorization, and adapt when the situation changes.

## What the demo does

1. Receives three fictional, narrative incident reports.
2. Uses **GPT-5.6 Structured Outputs** to extract machine-readable power contracts with source quotes and explicit assumptions.
3. Creates a plausible but unsafe candidate assignment.
4. Runs a deterministic safety kernel that blocks the assignment because its required duration and 35% return reserve fail.
5. Finds a zero-violation plan across power, energy, connector, route, deadline, and mobility constraints.
6. Requires human approval before a simulated dispatch.
7. Simulates an East Bridge closure and automatically re-plans the water-station mission through a safe alternate vehicle and route.

The key distinction is simple:

> A chatbot can explain a power request. Lifeline Grid proves which battery can serve it safely, preserves the decision state, and re-plans when the world changes.

## Decision architecture

```text
Fictional reports
      ↓
GPT-5.6: structured need extraction
      ↓
Candidate assignment
      ↓
Deterministic safety kernel
      ↓
Verified plan → Human approval → Simulated dispatch
      ↑                              ↓
      └──────── disruption / re-plan ┘
```

GPT-5.6 interprets unstructured language. It never authorizes a dispatch. Numeric feasibility is calculated deterministically, and a human remains the final authority.

## Safety kernel

For each vehicle–facility pair, the planner evaluates:

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

No constraint is relaxed to force a solution. An infeasible assignment is visibly blocked.

## OpenAI usage

- **GPT-5.6** runs in the application at `/api/analyze` and converts reports into a strict JSON schema.
- The UI labels whether the live model or the transparent synthetic fallback produced the contracts.
- **Codex** was used as the primary development collaborator for product framing, architecture, interaction design, implementation, safety logic, tests, and submission materials.
- Human decisions included the problem choice, safety boundary, reserve policy, fictional scenario, approval requirement, and final submission authorization.

The fallback exists so judges can exercise the full deterministic mission loop without a secret. For the submission video, configure `OPENAI_API_KEY` so the interface displays **GPT-5.6 LIVE**.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local for live GPT-5.6 extraction.
npm run dev
```

Open the local URL shown by the development server.

## Test and build

```bash
npm run test:planner
npm test
```

The planner tests verify that:

- the tempting E-12 clinic assignment is rejected;
- the initial verified plan has zero violations;
- critical energy is fully served; and
- an East Bridge closure safely reassigns the water mission to E-44.

## Repository map

- `app/page.tsx` — interactive command-center experience
- `app/api/analyze/route.ts` — GPT-5.6 structured report extraction
- `lib/planner.ts` — deterministic energy and dispatch planner
- `tests/planner.test.ts` — safety and re-planning tests
- `DEMO_SCRIPT.md` — sub-three-minute video plan
- `SUBMISSION.md` — English submission copy

## Data and operational boundaries

- Every facility, vehicle, report, route, timestamp, and metric in the demo is fictional.
- Do not input personal data, confidential documents, or real emergency information.
- The prototype has no real vehicle connection and performs no autonomous dispatch.
- A real deployment would require certified hardware integration, local emergency-governance review, cybersecurity controls, operator training, and field validation.

## License

Prototype created for OpenAI Build Week 2026. Add a repository license before any use beyond the competition prototype.
