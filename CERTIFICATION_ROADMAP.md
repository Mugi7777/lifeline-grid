# Certification and Production Assurance Roadmap

Lifeline Grid is not certified. Certification is written assurance from an independent body that specified requirements are met; it cannot be produced by an AI, a code commit, or a passing test suite. This roadmap turns the prototype into auditable evidence while preserving that boundary.

## Target framework map

| Framework | Intended scope | Current position | What would count as progress |
|---|---|---|---|
| [ISO/IEC 27001:2022](https://www.iso.org/standard/27001) | Organization-wide information security management system | Not certified | Defined ISMS scope, asset/risk registers, policies, control operation evidence, internal audit, management review, and independent certification audit |
| [ISO/IEC 42001:2023](https://www.iso.org/standard/42001) | AI management system | Not certified | AI inventory, impact/risk ownership, data/model controls, transparency, monitoring, incident handling, internal audit, and independent certification audit |
| [ISO/IEC 23894:2023](https://www.iso.org/standard/77304.html) | AI risk-management guidance | Partially reflected in design | Traceable risk treatment and residual-risk acceptance across the lifecycle |
| [ISO/IEC 42005:2025](https://www.iso.org/standard/42005) | AI-system impact assessment guidance | Not completed | Pre-deployment impact assessment with affected-party analysis and documented mitigations |
| [ISO 22301:2019](https://www.iso.org/standard/75106.html) | Business continuity management system | Runbook only | Business-impact analysis, RTO/RPO, continuity plans, exercised recovery, corrective actions, and audit |
| [ISO 39001:2012](https://www.iso.org/standard/44958.html) | Road-traffic safety management system | Applicability to be assessed with road operators | Road-safety objectives, responsibilities, performance factors, incident learning, and auditable operation; this is not a blanket product-safety certificate |
| [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) | Secure software development practices | Initial CI and threat model | Traceable secure-development practices, provenance, vulnerability response, protected build and release evidence |
| [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) | Web application security verification baseline | Self-assessment not completed | Requirement-by-requirement verification plus independent penetration testing |
| [OWASP LLM Verification Standard 2.0](https://owasp.org/www-project-llm-verification-standard/LLMSVS-v2.0-en.html) | LLM application controls | Partial strict-schema and authority separation | Threat-led test corpus, model/data boundary verification, monitoring and red-team evidence |
| [METI AI Guidelines for Business v1.2](https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/20260331_report.html) | Japan AI governance guidance | Initial alignment only | Completed checklist/workbook, named governance owners, impact/risk evidence and continuous review |
| [ISMAP](https://www.ismap.go.jp/csm?id=kb_article_view&sysparm_article=KB0010301) | Japanese government cloud procurement security evaluation | Out of scope for the prototype | Procurement-scope decision, registered-cloud/service strategy, registered assessor audit and steering-committee registration where required |

Framework names in the UI are cross-references, not claims of conformity. Applicability and certification scope must be set with qualified counsel, auditors, public authorities, and operating partners.

## Stage 0 — Reproducible prototype (current)

Exit evidence:

- deterministic and model-boundary tests pass;
- signed authority-event verifier rejects tamper, expiry, unknown keys, and private-key material;
- replay-protection schema and fail-closed endpoint exist;
- process health is separated from operational readiness;
- the product visibly reports `not_certified` and `field blocked`.

This stage permits synthetic demonstration and supervised tabletop work only.

## Stage 1 — Secure shadow-pilot candidate

Required work:

- organization and tenant model with least-privilege RBAC/ABAC and phishing-resistant MFA;
- production authority PKI, rotation, revocation, clock synchronization, and cross-source reconciliation;
- encrypted data classification, retention/deletion, privacy impact assessment, and tenant export controls;
- protected CI/CD, release signing, build provenance, SBOM, secret scanning, SAST, dependency policy, DAST/API fuzzing, and rollback;
- centralized tamper-resistant audit logging, alerting, rate limits, abuse controls, and incident response;
- defined SLOs, error budgets, RTO/RPO, backup/restore automation, load/capacity testing, and multi-region failure design;
- ASVS/LLMVS self-assessment followed by independent penetration and AI red-team testing; and
- a formally approved, read-only shadow-pilot protocol with stop criteria and no external actuation.

Exit decision must be signed by product, security, privacy, reliability, road-domain, operator, and independent evaluation owners.

## Stage 2 — Management-system readiness

Create the organizational evidence that source code cannot supply:

1. define ISMS, AI-management, and business-continuity scope;
2. establish policies, competence, supplier controls, risk registers, objectives, metrics, and corrective-action processes;
3. operate the controls long enough to produce representative records;
4. complete internal audits and management reviews;
5. close nonconformities; and
6. engage accredited independent certification bodies for the selected standards.

Certification scope must name the exact legal entity, locations, service boundaries, cloud dependencies, and exclusions. A certificate held by a cloud provider does not automatically certify Lifeline Grid.

## Stage 3 — Supervised regional validation

- connect official sources in read-only mode with signed provenance and freshness rejection;
- compare Lifeline output with normal authorized practice without influencing live decisions;
- pre-register false-safe, abstention, coverage, latency, data-quality, operator-workload, equity, and recovery metrics;
- investigate every discrepancy and near miss;
- perform failure injection, tabletop incidents, backup restoration, security response, and operator comprehension tests; and
- publish an independently reviewed safety/impact report with residual risks and restricted uses.

Only a named road authority and licensed operator can decide whether evidence supports a limited advisory pilot. Lifeline Grid remains non-autonomous.

## Stage 4 — Public-sector and scaled operation

For Japanese government procurement, assess whether ISMAP or an applicable procurement route is required. Decide whether to deploy on an already registered cloud/service boundary or pursue the substantially larger audit and registration program for the service itself.

Scaled operation additionally requires multi-region architecture, tested regional isolation, tenant-level SLOs, 24/7 incident ownership, supplier contingency, release rollback, disaster exercises, capacity forecasts, support obligations, and continuous control monitoring. “Google-grade” should be measured by observed reliability and governance evidence, not by brand comparison.

## Non-negotiable claim rules

- Never write “ISO compliant,” “ISO certified,” “ISMAP registered,” “safety certified,” or “production ready” without a current document that covers the exact service scope.
- A cryptographic signature proves source integrity and key possession, not physical road safety or truth.
- A hash proves integrity relative to the hashed bytes, not identity or non-repudiation.
- Model reasoning, confidence, benchmark results, and demo success are never authority.
- Any missing trust registry, durable replay store, audit evidence, or human authority fails closed.
