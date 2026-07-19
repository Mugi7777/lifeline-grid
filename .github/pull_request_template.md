## Change and evidence

- [ ] Scope and user impact are stated.
- [ ] Trust-boundary or threat-model effects are stated.
- [ ] Deterministic tests cover success, failure, tamper, and stale-data behavior where applicable.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and the production dependency audit pass.
- [ ] Migration, rollback, monitoring, and degraded-mode behavior are documented where applicable.
- [ ] No secret, private authority key, personal data, or operational road/fleet data is committed.
- [ ] No test result, signature, hash, AI output, or self-assessment is described as certification.
- [ ] Human authority and field-operation gates remain fail closed.

## Independent review

Name the reviewer for security-, safety-, data-, or migration-significant changes. Self-review is insufficient for an operational release.
