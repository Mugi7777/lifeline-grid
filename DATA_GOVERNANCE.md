# Data Governance Boundary

The durable Regional Access decision ledger is an identity-scoped pilot feature, not an approved repository for operational or resident data.

## Data stored when a user chooses “Record current plan”

- the signed-in ChatGPT email address;
- an optional named reviewer email address;
- the submitted regional model and road-closure identifiers;
- the server-recomputed plan, metrics, constraint evidence, solver version, and optimality status;
- the repair-budget parameter and predecessor run identifier;
- scenario labels, review comments, decisions, and timestamps; and
- SHA-256-linked audit-event metadata.

The application does not persist a plan merely because it was calculated or displayed. Persistence begins only when an authenticated user explicitly records it.

The `POST /api/data-trust` validation surface does not persist submitted bundles. It returns a no-store evaluation and a digest-bound evidence manifest. This non-persistence does not authorize real operational data: the current prototype still prohibits real authority records, fleet data, resident information, and confidential source payloads.

The Pilot Data Sandbox reads a selected GeoJSON file in the active browser tab. Its implementation does not post or persist the file; the downloaded evidence contains metadata, findings, counters, and digests rather than source geometry. OpenStreetMap basemap tiles are separate network requests and may expose the viewed area and ordinary request metadata to the tile provider. Local-only analysis is a minimization control, not authorization to process real data. Use only fictional or formally approved, de-identified, licensed, segmentized road exports under a written tabletop protocol.

The Nankai Trough 72H Response Lab currently loads only bundled fictional facilities, patient cases, inventories, vehicles, road states, search zones and situation reports. A report submitted to the Sol Council is sent to the OpenAI API when live mode is available with `store: false`; otherwise the labeled deterministic fallback is used. The application does not persist the report, selected phase, selected world, or intervention. Its evidence download contains the fictional decision state and digest. This architecture is not approval to add real clinical, aircraft, restricted-infrastructure, inventory, or incident-command data; such adapters remain prohibited until the governance, privacy, clinical, aviation, security, and retention controls in `NANKAI_RESPONSE_LAB.md` are approved.

Emergency Power uses the same no-store reasoning boundary. Text entered into **Sol Power Council** is sent to the OpenAI API when live mode is available with `store: false`; otherwise the labeled deterministic fixture is used. The application does not persist the report, selected world, exercise confirmations, or evidence package. A downloaded package is created in the user's browser and includes the report-derived hypotheses and deterministic results. Only the built-in fictional report is approved for this release; do not enter real incidents, facility details, road restrictions, fleet telemetry, personal data or confidential information.

## Current access control

- list access is limited to the creating email or the explicitly assigned reviewer email;
- review access is limited to the assigned reviewer;
- the creator cannot approve their own run;
- API authorization is enforced server-side; and
- the hosting access policy currently restricts the entire Site to its owner.

This is identity scoping, not a complete enterprise tenant model. Before a multi-organization pilot, add organization membership, region and purpose scopes, administrator roles, authorization-matrix tests, and an access-review process.

## Integrity boundary

Each event contains its predecessor hash and a digest of the relevant payload. Verification replays the event chain and separately recomputes the binding between the stored request, result, decision metadata, and the creation/review events. It fails when the event history is empty, out of order, internally changed, or no longer matches the stored record. The chain is stored durably in D1, but it is not KMS-signed, externally timestamped, write-once storage, or legal non-repudiation; an administrator with full database-write access could rebuild it.

## Prohibited data in the current prototype

- resident names, addresses, health information, or other personal identifiers;
- real delivery orders or commercially confidential operator data;
- authoritative road-inspection records or unannounced restrictions;
- credentials, API keys, payment data, or incident secrets;
- information whose owner has not approved processing in this prototype; and
- unrestricted geometry that would reveal protected facilities, residents, critical infrastructure, or non-public restrictions.
- real patient/casualty records, hospital acceptance or capacity, aircraft/drone tasking, emergency inventory, or restricted incident-command information.

## Required before a real pilot

- a named data controller and processors;
- documented purpose, lawful basis, minimization, retention, deletion, export, and breach procedures;
- jurisdiction-specific privacy and procurement review;
- encryption and key-management review, backups, restoration tests, and legal hold;
- resident-level privacy impact assessment if aggregation is insufficient; and
- a user-facing privacy notice and support/contact route appropriate to the deployed organization.

No retention period or automated deletion claim is made by the current software. Pilot operators must not enter real data until those controls are implemented and approved.
