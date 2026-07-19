# Lifeline Grid Evaluations

This document makes the demo's performance comparison reproducible and bounded. It is an evaluation of one synthetic scenario, not evidence that the prototype is safe for real emergency use.

## Evaluation question

Does a plan selected for bounded uncertainty fail less often than a nominal nearest-feasible assignment under the same fictional conditions?

Can the system identify which unresolved operator fact is worth checking before dispatch, measured by failures avoided after answer-specific re-optimization?

## Compared strategies

### Greedy baseline

Facilities are ordered by priority and deadline. For each one, the baseline selects the nearest still-unused vehicle that passes all constraints at nominal values.

### Lifeline robust optimizer

The optimizer evaluates all `5 × 4 × 3 = 60` complete allocations. Plans are ranked lexicographically:

1. maximize priority-weighted assignments that pass the joint adversarial corner;
2. maximize stress-scenario success;
3. minimize priority-weighted arrival time;
4. maximize the worst post-mission reserve margin; and
5. minimize travel distance as the final tie-breaker.

Because all 60 allocations are evaluated, the selected allocation is the exact optimum for this stated model and objective.

## Scenario suite

The test suite contains 256 deterministic low-discrepancy points generated with a Halton sequence using bases 2, 3, and 5.

| Variable | Range |
|---|---:|
| Facility demand | 90–110% |
| Vehicle SoC | nominal ±5 percentage points |
| Travel time and travel energy | 80–120% |

The selected plan must also pass the joint adversarial corner: demand 110%, SoC −5 points, and travel 120%.

## Current reproducible result

| Strategy | Successful scenarios | Success rate | Violation scenarios | Worst reserve margin |
|---|---:|---:|---:|---:|
| Greedy nearest-feasible | 207 / 256 | 80.9% | 49 | −3.2 points |
| Lifeline robust optimizer | 256 / 256 | 100.0% | 0 | +7.2 points |

The baseline's fragile assignment is E-32 → North Shelter. It is feasible at nominal values but breaches duration or mobility reserve in 49 bounded scenarios. The robust plan uses E-44 for the shelter and preserves E-21 for the time-critical water mission.

After East Bridge closes, the exact optimizer rebuilds the full plan:

- E-07 → Riverside Clinic;
- E-21 → North Shelter; and
- E-44 → East Water Station via Ridge Bypass.

The re-optimized plan succeeds in 256/256 scenarios under the same bounds.

## Decision-critical question evaluation

The fictional policy layer defines three uncertainty probes that correspond to explicit operating assumptions:

| Probe | Confirmed world | Adverse world |
|---|---|---|
| Water pump start-up | 4.2 kW average and peak | 4.2 kW average, 6.5 kW peak |
| Shelter heating | 2.4 kW continuous load | 3.2 kW continuous load |
| Clinic restoration | 8-hour service | 10-hour service |

For each of the six answer worlds, the evaluator performs two tests:

1. keep the provisional robust allocation and stress it across 256 scenarios; and
2. re-run all 60 allocations, select the exact answer-specific optimum, and stress it across the same 256 scenarios.

This produces `3 × 2 × (60 × 256 + 256) = 93,696` counterfactual plan-scenario evaluations. Questions are ranked lexicographically by avoidable violation scenarios weighted by facility priority, then by the number of missions that change, with extraction confidence used only as a final small signal.

### Current reproducible question result

| Result | Value |
|---|---:|
| Top-ranked fact | Water-station start-up surge |
| Provisional-plan failures if 6.5 kW peak is real | 226 / 256 |
| Answer-specific optimized-plan failures | 0 / 256 |
| Vehicle missions changed | 2 |
| Equal-weight expected failures avoided | 113 / 256 |

The adverse answer preserves average energy demand at 4.2 kW and changes only the peak-power envelope. E-21 therefore fails the inverter check without falsely increasing four-hour energy use. The informed optimum assigns E-44 to Water and E-21 to Shelter, and remains safe in 256/256 bounded scenarios.

The equal-weight expectation is a transparent demo convention, not a claim that the two answers are equally likely in real disasters.

## Reproduce

```bash
npm run test:planner
```

The planner tests assert deterministic scenario generation, exact-search evidence, baseline fragility, robust-plan success, value-of-information ranking, peak-versus-average power handling, and safe global re-optimization.

## Limitations

- Only three facilities, five vehicles, and a synthetic route matrix are modeled.
- Input distributions are bounded test assumptions, not empirically calibrated disaster distributions.
- Facility demand, vehicle SoC, and travel variation are the only uncertain variables.
- The three question probes and their adverse values are fictional operator policy inputs, not learned distributions.
- The value-of-information score uses bounded scenario counts and equal answer weights, not calibrated real-world probabilities.
- No grid power flow, battery degradation, traffic network, electrical certification, cyber-physical integration, or human-factors validation is modeled.
- Passing this test suite is not a safety certification.

A real pilot would require domain-owned scenarios, independent evaluation, validated solvers, certified hardware interfaces, security review, and emergency-governance approval.
