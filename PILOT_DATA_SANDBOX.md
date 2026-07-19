# Pilot Data Sandbox

The Pilot Data Sandbox is the first bridge from Lifeline Grid's bundled synthetic model to a partner-supplied, de-identified road network. It is designed for a supervised municipal tabletop exercise, not road diagnosis, navigation, dispatch, or field authorization.

## What is implemented

- local browser parsing of `.geojson` and `.json` files; the source file is not posted to a Lifeline API;
- strict `FeatureCollection` validation with a 10 MB, 10,000-feature, 200,000-coordinate, and 1,000-part-per-feature limit;
- bounded `LineString` and `MultiLineString` acceptance with stable segment identities;
- finite WGS84 coordinate validation, duplicate-ID rejection, endpoint-collapse rejection, and per-feature fault isolation;
- endpoint graph construction using four-decimal coordinate snapping, approximately 10 metres at Japanese latitudes;
- iterative Tarjan low-link analysis for graph bridges and articulation points without recursive call-stack risk;
- deterministic bridge-risk ranking using exposed endpoint count and an optional condition-grade multiplier;
- OpenStreetMap basemap rendering with all bridge findings and a bounded sample of ordinary roads;
- visible source, metadata-quality, tabletop, and field-decision gates; and
- SHA-256 evidence JSON binding the normalized network fingerprint, topology result, quality findings, algorithm counters, and gate state.

The maximum bounded 10,000-segment chain is included in automated tests. The test verifies 10,001 endpoint nodes, 10,000 bridge segments, 9,999 articulation nodes, and 20,000 adjacency traversals without recursion. Runtime depends on the browser and device; no production latency SLO is claimed.

## Input contract

The root must be a GeoJSON `FeatureCollection`. Every accepted road feature must have either `properties.segment_id` or a valid GeoJSON feature `id`. Optional attributes are:

```json
{
  "type": "FeatureCollection",
  "lifeline": {
    "sourceLabel": "De-identified municipal road export",
    "regionId": "approved-tabletop-region",
    "license": "declared-by-data-owner",
    "observedAt": "2026-07-19T00:00:00Z"
  },
  "features": [
    {
      "type": "Feature",
      "id": "road-001",
      "properties": {
        "segment_id": "road-001",
        "name": "Tabletop corridor A",
        "condition_grade": 3,
        "weight_limit_t": 8
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[137.0, 35.0], [137.01, 35.0]]
      }
    }
  ]
}
```

`regionId`, license, complete feature acceptance, condition grade, and weight limit contribute to the tabletop-quality disclosure. They do not authenticate the file. A locally selected file always remains `unverified_local_file` and the field-decision gate is always blocked.

## Topology boundary

The graph connects accepted line endpoints after four-decimal snapping. It does not infer an intersection where two lines merely cross, detect bridges or tunnels, split a long line at intermediate junctions, derive turn restrictions, or prove that a road is physically passable. A data owner must provide a segmentized network with reviewed grade separation and topology.

A graph bridge means that removing one accepted segment disconnects its endpoint component. It is not the same as a physical bridge structure and is not a structural-condition diagnosis. An articulation point is likewise a topology finding, not an instruction to inspect or close a location.

## Privacy and network behavior

File text is read and analyzed in the active browser tab. This feature does not call `fetch`, persist the file, or send the payload to an application server. Exporting evidence creates a local download containing metadata, findings, counters, and digests—not the source geometry.

The map separately requests OpenStreetMap tiles. Those requests reveal ordinary web-request metadata such as client IP and viewed tile coordinates to the tile provider. An approved pilot must either accept that boundary, use an approved tile service, or disable/replace the basemap. Local processing is not permission to use personal, confidential, restricted, or unlicensed data.

## Algorithm and evidence

Let `V` be endpoint nodes, `E` accepted road segments, and `B` detected graph bridges. Iterative Tarjan detection is `O(V + E)`. Deterministic ranking is `O(B log B)`, so the displayed end-to-end algorithmic bound is `O(V + E + B log B)`. Map rendering samples ordinary roads above 2,500 while always displaying every bridge finding; analysis still evaluates every accepted segment.

The FNV-1a network fingerprint is a fast deterministic replay identity, not a security primitive. The exported evidence object additionally receives a SHA-256 digest. Neither digest authenticates the data owner, proves non-repudiation, or makes the source authoritative.

## Tabletop protocol

1. Obtain written data-owner permission and remove resident, order, and confidential attributes.
2. Validate and segmentize topology in the owner's GIS workflow.
3. Record the dataset version, extraction time, license, region, and responsible reviewer.
4. Load the file locally and review every rejected feature and metadata gap.
5. Compare detected bridge segments with an expert-owned reference set.
6. Investigate false positives and false negatives, especially crossing and grade-separation cases.
7. Export evidence and retain it with the original approved dataset under the owner's retention policy.
8. Do not issue a road, inspection, route, or dispatch decision from this output.

## Required before shadow or field use

- an authenticated, server-owned GIS adapter with freshness, scope, signing, replay, and outage controls;
- authoritative structure and road-owner identifiers plus reviewed intersection topology;
- organization tenancy, purpose-scoped roles, retention, deletion, and audit controls;
- calibrated evaluation against representative historical disruptions and expert labels;
- browser/device, concurrency, soak, failure, and recovery testing with defined SLOs;
- privacy, security, procurement, licensing, accessibility, and human-factors review;
- independent penetration testing and solver/topology validation; and
- a named municipality, road authority, logistics operator, and independent evaluator under a written shadow-pilot protocol.

This implementation makes a de-identified tabletop exercise technically possible. It does not make Lifeline Grid a Google-scale service, a certified product, or an authorized field system.
