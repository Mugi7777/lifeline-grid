# Regional Scale Proof

This evidence page defines the bounded performance demonstration shown at the top of Regional Access mode. It exists to make the implementation inspectable without converting a synthetic benchmark into a production claim.

## Workload

The benchmark deterministically generates either 512 or 2,048 synthetic service zones over the Gujo mountain basemap. The 2,048-zone case contains:

- 2,048 zones;
- 5,481 sparse road links;
- three service hubs;
- 114,612 modeled households and 26,289 modeled priority residents;
- a 90-minute essential-access threshold;
- 5,481 flow-screened link failures; and
- 64 exact counterfactual closure replays after screening.

Real OpenStreetMap geography is used only as the visual basemap. Zone demand, topology, road condition, failure probability, service thresholds, and results are synthetic.

## Algorithm

1. Run multi-source Dijkstra from all service hubs.
2. Accumulate household and priority-resident exposure over the resulting shortest-path forest.
3. Score every link by exposed flow, deterioration risk, condition, and corridor role.
4. Select the 64 highest-flow candidates.
5. Remove each candidate independently and rerun the full shortest-path analysis.
6. Rank the reproduced consequences by lost access, isolated households, vulnerable residents, delay, and modeled failure probability.

The 2,048-zone workload performs 65 Dijkstra runs and 711,034 graph relaxations. The network fingerprint is `fnv1a:493cc02c`. Timings are deliberately excluded from the deterministic evidence object and measured separately on each runtime.

## Reproduction

```bash
npm run benchmark:scale -- 10
```

One ten-iteration run on 2026-07-19 using Node v24.14.0 on Linux x64 produced:

| Zones | Links | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|
| 512 | 1,329 | 15.97 ms | 26.02 ms | 26.02 ms |
| 2,048 | 5,481 | 72.90 ms | 108.92 ms | 108.92 ms |

These values are a single-process synthetic benchmark on one environment. They are not a production SLO, browser guarantee, throughput result, fleet-routing benchmark, or evidence of Google-scale operations. The UI repeats the calculation locally and labels that duration as runtime-specific.

## Safety and product boundary

- The benchmark never controls a road, vehicle, or public notice.
- A map tile failure does not affect the deterministic graph calculation.
- A ranked link is a hypothesis for review, not a structure diagnosis.
- Only the sampled geometry is rendered on small devices; the complete graph remains in the calculation.
- Production validation requires licensed authoritative topology, representative demand, concurrency and soak tests, p50/p95/p99 measurement on controlled hardware, failure injection, and independent replay.
