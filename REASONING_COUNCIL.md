# Sol Reasoning Council

## Purpose

Real regional operations often begin with contradictory prose rather than a clean road-state event. A driver may report passage, a resident may report debris, and an authority notice may still be pending. Choosing one narrative too early can hide either an access gap or an unnecessary disruption.

The Lifeline Grid Reasoning Council separates two jobs:

1. `gpt-5.6-sol` proposes exactly three competing, testable interpretations and the evidence that would distinguish them.
2. Deterministic regional software independently calculates the routing, access, stress, and N-1 consequences of every valid interpretation.

The model is an uncertainty analyst, not the authority and not the numerical oracle.

## Bounded model contract

The `/api/regional-reasoning` route uses the Responses API with:

- explicit model `gpt-5.6-sol`;
- `reasoning: { effort: "high" }`;
- strict Structured Outputs;
- `store: false`;
- a maximum 6,000-character untrusted report;
- an allowlist of road IDs and road states;
- exactly three unique hypothesis IDs; and
- one to three evidence questions.

Each hypothesis must retain evidence for, evidence against, assumptions, and a bounded support score. Weight-limited states must specify 2–10 tonnes. Open and closed states cannot smuggle in a weight value. Runtime validation rejects invented road IDs, duplicate hypotheses, malformed restrictions, unsupported evidence classes, and invalid question links.

The prompt explicitly treats the report as data rather than instructions. It forbids the model from calculating routes, inventing impact metrics, diagnosing structural safety, creating legal restrictions, authorizing dispatch, or treating observed passage as proof of safety.

If live model access is absent or fails, the endpoint returns a clearly marked deterministic fallback. The safety kernel and human-authority gate remain available.

## Deterministic adjudication

For each valid hypothesis the kernel:

1. applies only the proposed bounded road-state change;
2. re-runs the exact six-stop pooled delivery plan;
3. measures household, vulnerable-resident, parcel, deadline, and critical-service consequences;
4. runs the 64-scenario regional stress suite; and
5. preserves exact/feasible solver evidence.

It then ranks each evidence question by the consequence difference between its yes/no worlds. Authenticated authority status receives a safety-gate priority ahead of ordinary optimization value. The ranking also includes critical failures, critical stress, vulnerable residents, households, and distance swing.

For the built-in synthetic report the three worlds are:

- North Forest Road fully closed;
- a temporary four-tonne restriction; and
- the last verified state remains open.

Across those worlds the kernel evaluates 12,288 active assignment candidates, 192 stress scenarios, and 36 N-1 road cases. The highest-value question asks for authenticated road-authority status. Its modeled decision swing is 64 households and 32 vulnerable residents.

These counts are computational evidence for a fictional fixture. They are not calibrated probabilities or field-performance claims.

## Authority boundary

Every response contains:

- `actionGate: human_authority_required`; and
- `modelRecommendationStatus: withheld_pending_evidence`.

No UI action applies the proposed closure or dispatches a vehicle. Model support scores are epistemic hints only. Hidden chain-of-thought is neither exposed nor treated as evidence; reviewers see only bounded claims, counterevidence, source requests, and metrics reproduced by the deterministic kernel.

## Verification and performance

The automated suite covers strict fallback conformance, three-world evaluation, authority gating, exact access swings, unsupported-road rejection, malformed-restriction rejection, prompt-injection text, API fallback behavior, and deterministic replay.

On the Build Week development environment on 2026-07-19, 25 measured adjudications after three warmups produced:

| Kernel latency | Result |
|---|---:|
| Minimum | 49.43 ms |
| p50 | 55.78 ms |
| p95 | 60.00 ms |
| Maximum | 75.49 ms |

This measures only the deterministic three-hypothesis kernel on the fixed synthetic Mizunoki fixture. It excludes OpenAI network/model latency, is not a production SLO, and does not establish performance on a larger or geographic network.

Some hosted edge runtimes intentionally do not expose a progressing high-resolution clock during synchronous CPU work. In that case the product reports the kernel as `BOUNDED` and shows total request time instead of presenting a misleading `0 ms` measurement. The reproducible benchmark above remains explicitly separated from hosted request latency.

Run it with:

```bash
npm run benchmark:reasoning -- 25
```

## Remaining work before a real advisory pilot

- signed road-authority connectors, timestamps, freshness checks, and revocation;
- a domain-owned corpus of conflicting reports, prompt injections, and rare road states;
- hypothesis-diversity, calibration, abstention, and source-attribution evaluations;
- independent road-engineering and logistics review;
- shadow-mode comparison with expert decisions;
- enterprise identity, tenancy, rate limits, monitoring, and incident response; and
- explicit governance for who may accept, reject, or override a recommendation.

Passing the current tests does not certify road safety or authorize real operations.
