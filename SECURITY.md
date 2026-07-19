# Security Policy

## Supported status

Lifeline Grid is a competition prototype for synthetic simulation and supervised tabletop evaluation. No version is currently supported for real dispatch, road diagnosis, road closure, public-safety reliance, resident eligibility, or physical control.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use GitHub's **Security → Report a vulnerability** private-reporting flow when enabled. If private reporting is unavailable, do not transmit secrets, personal data, exploit payloads, or operational road/fleet data; the maintainer must configure a private security contact before any external pilot.

Include the affected commit, component, reproduction steps using synthetic data, impact, and suggested remediation. Never test against real authorities, fleets, residents, or third-party systems without written authorization.

## Security boundaries

- `OPENAI_API_KEY` and all integration credentials are server-side secrets.
- `AUTHORITY_TRUST_REGISTRY_JSON` contains public keys only. Authority private keys must remain with the issuing organization in an approved KMS/HSM process.
- Signed road events are accepted only for human review; they are never automatically applied.
- Missing authentication, trust registry, signature verification, freshness, replay persistence, or independent review must fail closed.
- Synthetic and real data must never share an indistinguishable environment or UI state.

## Dependency status

CI blocks high and critical production-dependency advisories with `npm audit --omit=dev --audit-level=high`. At the 2026-07-19 prototype checkpoint, npm also reports a moderate transitive PostCSS advisory under Next.js with no available fix. It must be re-evaluated before any pilot and cannot be waived solely because CI passes.

See `THREAT_MODEL.md`, `ASSURANCE_CASE.md`, and `CERTIFICATION_ROADMAP.md` for the open security and operational gates.
