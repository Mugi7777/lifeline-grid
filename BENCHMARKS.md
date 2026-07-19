# Reproducible Regional Solver Benchmarks

The scalable regional solver has a reproducible synthetic benchmark. Run:

```bash
npm run benchmark:regional -- 100
npm run benchmark:regional -- 250
```

The fixture is a star-shaped fictional road graph with one demand per community, ten delivery stops of capacity per vehicle, no cold-chain load, generous deadlines, and equal vehicle weight. It is useful for regression and computational profiling; it is not representative of a real municipality.

On the Build Week development environment on 2026-07-19, single runs produced:

| Demands | Vehicles | Candidate moves | Elapsed | Coverage | Critical failures |
|---:|---:|---:|---:|---:|---:|
| 100 | 10 | 19,200 | 0.37 s | 100% | 0 |
| 250 | 25 | 115,500 | 5.04 s | 100% | 0 |

These are single-run developer measurements, not p95 latency, a service-level objective, a production capacity claim, or evidence of performance on dense geographic graphs. The heuristic reports no optimality certificate. Production benchmarking must pin hardware, process isolation, graph families, fleet heterogeneity, time-window tightness, disruption load, warm/cold cache state, and a licensed routing baseline.

## Three-hypothesis reasoning adjudication

Run:

```bash
npm run benchmark:reasoning -- 25
```

The fixture uses the built-in synthetic conflicting report and measures only the deterministic work after a valid model proposal exists. After three warmups, 25 runs on the Build Week development environment on 2026-07-19 produced:

| Kernel metric | Result |
|---|---:|
| Minimum | 49.43 ms |
| p50 | 55.78 ms |
| p95 | 60.00 ms |
| Maximum | 75.49 ms |
| Hypotheses | 3 |
| Active assignment candidates | 12,288 |
| Stress scenarios | 192 |
| N-1 road cases | 36 |

This benchmark excludes GPT-5.6 Sol reasoning and network latency. It is a local synthetic regression measurement, not a production SLO or a claim about larger regional graphs.
