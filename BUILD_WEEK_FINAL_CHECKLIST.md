# OpenAI Build Week Final Checklist

This file separates implemented submission evidence from tasks that still require the entrant. It is not a substitute for the current official rules and FAQ; re-check both immediately before submission.

## Implemented and reproducible

- **Working product:** Lifeline Grid is deployed as a ChatGPT Site and the complete source is mirrored to `Mugi7777/lifeline-grid`.
- **Meaningful GPT-5.6 use:** `/api/emergency-reasoning` calls `gpt-5.6-sol` with high reasoning effort, strict Structured Outputs, `store: false`, a bounded asset/network context, and prompt-injection containment. The model creates three falsifiable power worlds, counterevidence and evidence requests; it does not merely write UI copy.
- **System contribution beyond chat:** every model world is independently run through exact assignment, six physical constraints and 256 deterministic stress states. No model-generated metric is trusted.
- **Visible model state:** the product labels `SOL LIVE`, `VERIFIED FALLBACK`, or `SOL REASONING`. A missing or unavailable API can never masquerade as a live model call.
- **Codex use:** Codex was the primary implementation collaborator for product definition, architecture, APIs, algorithms, interface, tests, safety boundaries, documentation and submission materials.
- **Safety boundary:** no model world is automatically applied. Road use, vehicle dispatch, electrical compatibility, connection and switching remain outside software authority.
- **Evidence:** deterministic tests cover unsupported routes/assets, duplicate worlds, three-world replay, value-of-information ranking, six constraints, N-1 recovery, API fallback, rendering and assurance controls.
- **Demo story:** `DEMO_SCRIPT.md` is a 2:55 Emergency Power recording plan with one visible input-to-impact loop.

## Entrant-controlled tasks before submission

1. **Confirm live Sol:** the hosted secret name is already `OPENAI_API_KEY`; ensure API billing/quota is active, run **Sol Power Council**, and record only when the badge reads `GPT-5.6 SOL LIVE`. Never paste the key into chat, GitHub, a video, or a screenshot.
2. **Provide judge access:** the Site is intentionally owner-only. Before submitting, either add the exact permitted judge audience through the supported access policy or explicitly approve the required broader access. Do not call it publicly released or field-ready.
3. **Record the video:** follow `DEMO_SCRIPT.md`, keep it below three minutes, show the live Sol badge, three world cards, highest-value evidence gate, H2/H3 map comparison, failed peak check, N-1 replay, dual control and the field-blocked boundary.
4. **Capture Codex evidence:** run `/feedback` in the primary Codex build thread and place the returned Session ID in the Devpost field and the placeholder in `SUBMISSION.md`.
5. **Final repository check:** verify the submitted GitHub URL opens without credentials required by the rules, contains the latest commit, and does not contain secrets, real incident data, personal data, or employer/customer material.
6. **Complete Devpost:** paste the final copy from `SUBMISSION.md`, add the working URL, repository, video and required media, select the correct track, accept the official terms, and submit before the official deadline shown on Devpost.

## Recording acceptance test

- A viewer understands the social problem within 15 seconds.
- GPT-5.6 Sol visibly changes an ambiguous report into three competing worlds by 40 seconds.
- The 12 h → 8 h coverage change, 16.8 kWh gap and 100-point mission swing are visible by 75 seconds.
- The viewer sees that the model did not produce those metrics.
- The real basemap and H2/H3 synthetic worlds are visible without implying navigation or dispatch authority.
- The field-operation block is visible and spoken.
- The close states what is implemented, not a Google-scale or safety-certification claim.

## Do not claim

- Google-scale throughput, nationwide readiness, certification, calibrated disaster prediction, clinical validity, road safety, autonomous dispatch, or a completed field pilot;
- that a SHA-256 digest proves source truth, identity, non-repudiation, or authorization; or
- that deterministic fixture improvements are observed real-world outcomes.
