# Emergency Power Operational Digital Twin

Lifeline Grid now implements a bounded operational digital twin for its synthetic Kochi emergency-power exercise. It is not a marketing relabel of a dashboard: vehicle state, facility load, road evidence and planning assignments advance on a shared event timeline, and every visible state can be replayed from the same inputs.

> This release has no live fleet, meter or road-authority connection. All telemetry and positions are deterministic synthetic exercise data. The production adapter contract is represented, but field operation remains blocked.

## State loop

```text
versioned verified plan
        ↓
synthetic telemetry events every 5 minutes
        ↓
freshness and source-coverage checks
        ↓
scalar Kalman state estimation
        ↓
dead reckoning with expanding uncertainty when a feed stops
        ↓
deterministic six-hour mission forecast
        ↓
plan-divergence and critical-gap evidence
        ↓
Sol uncertainty council when narrative evidence conflicts
        ↓
human inspection and dual control — never automatic actuation
```

The UI exposes three distinct layers:

- **Observed:** the last actual synthetic measurement. A value older than ten minutes becomes visibly `STALE`; the system never presents it as current.
- **Estimated:** a scalar Kalman filter combines bounded process and sensor noise. After feed loss, model-based change is carried forward and uncertainty expands.
- **Forecast:** the estimated state is projected six hours against facility contracts, asset output, usable energy, protected reserve, travel energy and remaining service duration.

## Deterministic algorithms

### Scalar Kalman filter

For each new measurement, the estimator performs a standard one-dimensional predict/update loop:

```text
P ← P + Q
K ← P / (P + R)
x ← x + K(z - x)
P ← (1 - K)P
```

The process-noise and measurement-noise terms are explicit in code. Each facility and vehicle exposes its current uncertainty band; no model-generated confidence value enters the filter.

### Six-hour critical-gap forecast

For each critical facility, deterministic code compares:

1. forecast load with the assigned vehicle's maximum output power;
2. remaining service energy plus return travel with energy available above the protected reserve; and
3. forecast SoC with the reserve threshold.

The displayed critical gap is the larger of the output-limited and energy-limited shortfall for each critical mission. It is a synthetic scenario projection, not a field-performance prediction.

### Plan divergence

The inspectable 0–100 signal combines only reproduced quantities: maximum estimated-versus-planned SoC deviation, maximum facility-load deviation, stale-source coverage and unresolved road-evidence conflict. It is a triage signal, not a safety certification.

## Failure injections

The first release includes four replayable worlds:

| Scenario | What changes | What does not happen |
|---|---|---|
| Nominal | Eight sources track the verified plan | No field dispatch |
| Pump drift | Water load rises from 4.2 toward 6.5 kW; a six-hour critical gap appears | No automatic asset swap |
| Bridge conflict | East Bridge becomes amber with two disagreeing reports | The route is not closed or removed from the plan |
| Telemetry loss | E-44 and the water meter become stale; observed state freezes and uncertainty grows | Estimated state is never mislabeled as observed |

The bridge-conflict state links to the GPT-5.6 Sol council. Sol can form falsifiable natural-language worlds, but deterministic software calculates every consequence and the selected operational world remains withheld behind human evidence.

## Replay evidence

`buildEmergencyTwinEvidence` exports:

- the complete versioned twin snapshot;
- current plan identity and route assignments;
- the telemetry, estimator, forecast and actuation claims;
- explicit authority gates; and
- a canonical SHA-256 digest.

The package deliberately contains `worldAutoApplication: prohibited`, `dispatch: human_dual_control_required` and `fieldOperation: blocked`.

## Production path

A real deployment would replace the synthetic event generator with authenticated, schema-versioned adapters for fleet telematics, facility meters, road authorities and incident command. It would also require device identity, time synchronization, signed events, out-of-order handling, offline operation, observability, tenant isolation, incident exercises, electrical validation, cybersecurity review and the applicable public-safety approval process.

The current value is a testable control-loop architecture and transparent failure behavior. It is not a claim of live integration, certified safety or Google-scale operations.
