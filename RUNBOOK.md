# Lifeline Grid Simulation Runbook

## Regional Access exercise

Regional mode is also synthetic unless an approved tabletop protocol explicitly supplies de-identified authoritative data. An operator may simulate one road restriction and a repair budget, inspect the recomputed service coverage, compare exact portfolios, and record disagreements. Stop immediately if a participant interprets a modeled condition or probability as an engineering diagnosis, uses resident-level identity, or attempts to issue a real closure or dispatch instruction from the interface.

When testing the durable ledger, recording a plan stores the signed-in email, optional reviewer email, complete submitted regional model, computed result, and audit events. Use synthetic identities and data only. A creator may record a draft or assign another authenticated email; only that distinct reviewer may approve or reject it. Verify the audit chain after each decision.

When testing signed road events, use a synthetic issuer key and the exact versioned envelope. Keep the private key outside Lifeline Grid. A `202 Accepted` response means only that the signature, scope, freshness, and replay checks passed and a pending review receipt was recorded. It does not mean the road state is true, safe, approved, or applied. Verify the linked official reference through an approved out-of-band channel before a tabletop reviewer records any simulated planning change.

### Local GeoJSON tabletop

1. Obtain written data-owner approval and prepare a de-identified, licensed, segmentized `FeatureCollection`; do not include resident, order, inspection-note, or confidential attributes.
2. Record the dataset version, extraction time, region, topology-preparation method, and expert reference findings outside Lifeline Grid.
3. Select the file in the Pilot Data Sandbox. Confirm the interface states `LOCAL PROCESSING · NO UPLOAD` and `FIELD DECISION GATE: BLOCKED`.
4. Review rejected features, missing metadata, disconnected components, bridge segments, and articulation points. Stop if topology is not intentionally segmented at intersections or grade separation is ambiguous.
5. Compare every finding with the expert reference. Record false positives, false negatives, runtime, device, browser, and operator interpretation errors.
6. Export the SHA-256 evidence JSON and retain it beside the approved source under the data owner's retention policy.
7. Do not diagnose a structure, set an inspection priority, close a road, or direct a driver from the result.

This runbook applies only to supervised simulation and tabletop evaluation. It does not authorize real emergency use.

### Nankai Trough 72H tabletop

1. Confirm the panel says `SYNTHETIC`, `AUTO PLAN · HUMAN AUTHORITY REQUIRED`, and `FIELD OPERATION BLOCKED` before discussing any result.
2. Begin at `0–6 hours`. Review the blocked and unknown roads; both must remain unusable by ground routing.
3. Inspect supply, critical-power, hospital-transfer, and drone-search gaps. Treat every facility, patient case, asset, deadline, inventory, and search area as fictional.
4. Run the highest-ranked road-clearance counterfactual. State aloud that opening one graph edge is a comparison, not a structural assessment, work estimate, clearance order, or road-opening instruction.
5. Compare the 24-hour and 72-hour phases. Record disagreements with the exercise reference plan and any unsupported inference by an operator.
6. Export the replay JSON and retain its digest with the exercise record. A matching digest proves byte-level reproducibility only.
7. Stop if anyone attempts to use the result for patient triage, hospital acceptance, vehicle or aircraft dispatch, road opening, drone launch, or a real incident.

For a future supervised partner tabletop, the exercise owner must provide a separate authoritative reference plan, explicit medical and aviation reviewers, data approval, and documented authority roles. The current software cannot conduct a shadow or field exercise.

## Roles

- **Field Operator** — enters or verifies source facts; cannot approve dispatch.
- **Incident Lead** — reviews mission scope and provides the first approval.
- **Safety Officer** — independently reviews constraints, N-1 result, and scope; must be a different identity.
- **System Owner** — maintains the service and coordinates technical incidents; cannot waive safety gates.

## Start conditions

1. Confirm the exercise is labeled synthetic and contains no confidential or personal data.
2. Confirm every facility, vehicle, route, and timestamp is fictional or explicitly approved for the exercise.
3. Confirm the application reports no real vehicle or facility connection.
4. Record the scenario owner and exercise objective outside the application.

## Mission workflow

1. Structure reports and inspect source quotes and assumptions.
2. Review the visibly rejected unsafe candidate.
3. Answer the decision-critical question as the Field Operator.
4. Review hard constraints, uncertainty results, and the greedy comparison.
5. Review N-1 failures and the selected preparedness action.
6. Incident Lead approves the synthetic scope.
7. A distinct Safety Officer co-signs.
8. Export the evidence package and retain its full package hash with the exercise record.
9. Inject the fictional disruption and confirm a global re-plan.
10. Export a second package if the changed state is part of the evaluation record.

## Immediate stop conditions

Stop the exercise and mark the result invalid if any of the following occurs:

- the interface no longer shows the synthetic boundary;
- a hard constraint fails but an assignment appears authorized;
- GPT output changes a numeric safety result directly;
- the N-1 count is incomplete but appears certified;
- the same actor fills both approval roles;
- evidence-package verification fails;
- the authority registry, event signature, validity window, road scope, or durable replay store cannot be proven;
- a signed road event appears applied without an authorized human review;
- confidential, personal, operational, or real emergency information is entered;
- an imported road file lacks data-owner approval, reviewed segmentization, declared scope, or license;
- a topology finding is interpreted as physical bridge condition, passability, or authority to act.
- a Nankai response score is interpreted as triage, hospital acceptance, dispatch, flight tasking, drone-launch authority, structural clearance priority, or a forecast;
- real patient, hospital, aircraft, inventory, restricted-infrastructure, or incident-command data is entered into the synthetic lab.

## Degraded-mode behavior

- If GPT-5.6 is unavailable, the interface may use its labeled synthetic fallback for the built-in scenario only.
- A fallback result must not be presented as live interpretation.
- If deterministic planning fails, do not continue to approval.
- If evidence export fails, the exercise may continue for UI testing but cannot count as an auditable evaluation run.

## Recovery

1. Preserve the browser-visible state and error message without adding sensitive data.
2. Export a Portable Twin Capsule when the current synthetic state is still readable; retain the full payload digest.
3. Keep the GitHub source URL and an independently stored source ZIP identified in `RECOVERY.md`.
4. Reset the training scenario or restore into a clean browser only after capsule verification succeeds.
5. Re-run the automated test suite and production build.
6. Reproduce with the built-in scenario.
7. Compare the new evidence package hash and audit event count with the expected workflow.
8. Treat a capsule older than 24 hours as stale and revalidate every source before review.
9. Document the cause, fix, tests, restoration time, lost-state interval, and reviewer before resuming evaluation.

## Post-exercise review

- compare the Lifeline plan with the reference human plan;
- list every disagreement, blocked gate, and manual override request;
- verify exported package integrity independently;
- record operator workload and comprehension problems;
- decide whether the next phase remains tabletop, advances to shadow mode, or stops.
