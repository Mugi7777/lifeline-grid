# Lifeline Grid Evaluations

This document makes the demo's performance comparison reproducible and bounded. It is an evaluation of one synthetic scenario, not evidence that the prototype is safe for real emergency use.

## Evaluation question

Does a plan selected for bounded uncertainty fail less often than a nominal nearest-feasible assignment under the same fictional conditions?

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

## Reproduce

```bash
npm run test:planner
```

The planner tests assert deterministic scenario generation, exact-search evidence, baseline fragility, robust-plan success, and safe global re-optimization.

## Limitations

- Only three facilities, five vehicles, and a synthetic route matrix are modeled.
- Input distributions are bounded test assumptions, not empirically calibrated disaster distributions.
- Facility demand, vehicle SoC, and travel variation are the only uncertain variables.
- No grid power flow, battery degradation, traffic network, electrical certification, cyber-physical integration, or human-factors validation is modeled.
- Passing this test suite is not a safety certification.

A real pilot would require domain-owned scenarios, independent evaluation, validated solvers, certified hardware interfaces, security review, and emergency-governance approval.
