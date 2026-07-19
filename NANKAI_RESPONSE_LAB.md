# Nankai Trough 72H Response Lab

The Nankai Trough Response Lab is a **synthetic, deterministic tabletop** inside Lifeline Grid. It tests whether one shared road state can support four concurrent missions during the first 72 hours after a maximum-class earthquake scenario: push supplies, mobile power, hospital-transfer planning, and drone-search planning. It also asks which single blocked or unknown corridor would restore the most life-support access if it became usable.

It is not a forecast, emergency plan, navigation tool, medical device, air-operations system, or dispatch system. Every facility, case, vehicle, inventory, road state, deadline, search grid, and result is fictional. The OpenStreetMap layer is a geographic reference only; the straight scenario connectors are not surveyed road geometry.

## Public-source design basis

The scenario structure, not its fictional values, is informed by:

- the Cabinet Office **Large-scale Earthquake and Tsunami Emergency Response Policy**, revised 13 July 2026, which emphasizes the first 72 hours, emergency transport routes, medical teams, supplies, fuel, and lifeline restoration: <https://www.bousai.go.jp/jishin/pdf/taisyohousin_gaiyou.pdf>;
- the Cabinet Office account of a Kochi isolated-community support exercise, in which drones helped identify isolated people and air assets transferred people and supplies: <https://www.bousai.go.jp/kohou/kouhoubousai/r07/113/news_15.html>; and
- the Cabinet Office summary of the 2025 maximum-class Nankai Trough damage assumptions: <https://www.bousai.go.jp/kohou/kouhoubousai/r07/113/news_02.html>.

These sources do not validate Lifeline Grid's scenario values or algorithms.

## Implemented decision pipeline

1. A phase-specific road graph marks each corridor `open`, `degraded`, `unknown`, or `blocked`. Unknown and blocked states fail closed.
2. A cached binary-heap Dijkstra engine computes only routes that use modeled usable corridors.
3. A commodity-specific successive-shortest-augmenting-path **min-cost flow** allocates scarce water, meals, and medicine from reachable depots. Priority penalties protect higher-priority reachable sites. This is an allocation envelope, not a vehicle schedule, and it does not yet share vehicle capacity across commodities.
4. An exhaustive lexicographic **power assignment** places a bounded generator, V2L vehicles, and battery trailer. It minimizes critical-site gaps before weighted unmet energy, then maximizes fully met sites and minimizes travel.
5. An exhaustive **deadline-constrained medical matching** assigns the bounded ambulance set only when pickup and receiving-hospital routes meet the modeled deadline. Unreachable cases become air-coordination requests; feasible cases left by the bounded fleet become a ground waitlist. The engine does not triage, confirm hospital acceptance, task an aircraft, or dispatch a vehicle.
6. An exhaustive **drone information-value matching** assigns a bounded drone fleet by expected people, uncertainty, access difficulty, medical relevance, endurance, speed, and search coverage. It does not launch an aircraft or model weather, regulation, communications, terrain occlusion, or airspace clearance.
7. A **single-corridor counterfactual replay** opens each blocked or unknown corridor individually, re-runs reachability, and ranks restored supply sites, feasible medical cases, and critical power sites against modeled clearance time. It does not estimate debris, structural work, crews, aftershocks, or legal priority.
8. A versioned replay package exports decisions, unresolved needs, algorithm counters, hard gates, and a canonical SHA-256 digest.

The objectives are deliberately lexicographic where life-safety constraints are involved. A shorter route cannot compensate for an additional critical power gap or the loss of a higher-priority feasible medical transfer.

## Reproduced synthetic baseline

| Modeled phase | Weighted supply coverage | Critical power gaps | Ground transfer plans | Air-coordination requests | Inaccessible nodes |
|---|---:|---:|---:|---:|---:|
| 0–6 hours | 50.2% | 1 | 0 / 5 | 5 | 3 |
| 24 hours | 76.2% | 1 | 2 / 5 | 2 | 1 |
| 72 hours | 81.0% | 0 | 3 / 5 | 1 | 0 |

For the 0–6 hour phase, the top modeled single intervention is the fictional `airbase-coastal` corridor. In this counterfactual, weighted supply coverage rises from 50.2% to 69.0%, critical power gaps fall from one to zero, and modeled inaccessible nodes fall from three to two. This is a deterministic comparison inside the fictional graph, not an operational claim.

The 0–6 hour baseline records 9 route searches, 72 road relaxations, 9 road-clearance replays, 9 min-cost-flow augmentations, 16 power assignment candidates, 1 medical assignment candidate, and 81 drone assignment candidates. Tests also prove that no accepted route traverses a blocked or unknown corridor and that evidence hashes are reproducible.

## Authority and safety contract

The software may **calculate and compare** plans. It may not:

- diagnose or open a road;
- prioritize or triage a patient;
- assert receiving-hospital capacity or acceptance;
- dispatch or remotely control a vehicle, generator, V2L asset, drone, helicopter, or aircraft;
- replace incident command, municipal authority, medical direction, aviation authority, or an accountable operator; or
- turn a model score, route, or digest into permission to act.

The UI therefore exposes `AUTO PLAN · HUMAN AUTHORITY REQUIRED` and keeps field operation blocked. A digest proves reproducibility of the exported bytes, not truth, identity, certification, or authorization.

## Verification

Run:

```bash
node --experimental-strip-types --test tests/nankai-response.test.ts
npm run typecheck
npm test
```

The focused suite covers deterministic baselines, phase recovery, corridor counterfactual benefit, fail-closed routes, reproducible evidence, and invalid phase/intervention rejection.

## Required before a supervised shadow pilot

- signed, authoritative hazard, road, bridge, weather, inventory, vehicle, facility, hospital-capacity, and airspace adapters with freshness and conflict handling;
- privacy and clinical-governance approval before any patient-level data, with separation of medical triage from logistics optimization;
- vehicle scheduling, shared capacity across commodities, loading, refueling, driver shifts, cold chain, depot handling, staging congestion, and return-route constraints;
- validated travel-time and topology data, including grade separation, debris, tsunami exclusion zones, landslides, bridge condition, aftershocks, and uncertainty calibration;
- aviation operator procedures, weather minima, communications coverage, geofencing, remote-identification requirements, and explicit launch/tasking authority;
- organization tenancy, role-based authorization, signed audit evidence, incident response, backup restoration, offline operation, and independent security assessment;
- comparison against expert-owned reference decisions using de-identified historical or exercise data; and
- an observed tabletop followed by read-only shadow mode. No dispatch integration is permitted in those stages.

Until those requirements are implemented and independently assessed, this module remains maturity level L1: an inspectable synthetic decision experiment.
