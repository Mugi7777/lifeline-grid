# Lifeline Grid Backup and Recovery

Lifeline Grid has two different things to preserve:

1. **application source** — the React, TypeScript, tests, documentation, configuration templates, and hosting manifest needed to rebuild the product; and
2. **portable twin state** — one synthetic planning scenario, its model identity, reproduced plan evidence, and integrity digest.

The Portable Twin Capsule does not replace a source-code backup, and a source ZIP does not contain hosted secrets or live service data.

## Save the complete application yourself

### Simplest method: download the current GitHub branch

Open:

<https://github.com/Mugi7777/lifeline-grid/archive/refs/heads/main.zip>

On iPhone or iPad, Safari downloads the ZIP into the Files app, normally under **Downloads**. Long-press or move it into iCloud Drive, another cloud drive, or external storage. On a computer, keep the ZIP outside the development folder.

The archive should contain at least:

- `package.json` and `package-lock.json`;
- `app/`, `lib/`, `db/`, `drizzle/`, `scripts/`, and `tests/`;
- `.openai/hosting.json`;
- `README.md`, safety documentation, and the license.

It intentionally does not contain `OPENAI_API_KEY`, hosted environment secrets, local `.env` files, browser storage, or D1 database contents.

### Git method

```bash
git clone https://github.com/Mugi7777/lifeline-grid.git
cd lifeline-grid
git switch main
```

Create an additional independent copy by storing the ZIP on a second provider or an offline drive. A practical minimum is the 3-2-1 pattern: three copies, two storage types, one off-site copy.

## Verify a downloaded source backup

After extracting it on a computer with Node.js 22.13 or newer:

```bash
npm ci
npm run typecheck
npm test
```

For live model calls, create a new local `.env.local` and set `OPENAI_API_KEY`. Never place that file or key in GitHub.

To recover without doing the technical work yourself, attach the ZIP to a new Codex conversation and request: “Restore this Lifeline Grid repository, run all tests, and deploy it as a new Site.” The new deployment will still require separately configured secrets and any required database migration or data restore.

## Save and restore portable twin state

Inside Regional Access mode, use **Save browser copy + JSON** in the Portable Twin Capsule panel. It:

- stores one copy in that browser when local storage is available;
- downloads a JSON copy to the device;
- binds the regional model, active road closure, repair budget, expected metrics, route evidence, and engine version with SHA-256 digests; and
- restores only after the current deterministic planner reproduces the same evidence.

Use **Verify device copy** to restore the browser copy or **Verify imported JSON** to inspect a file from another device. A capsule older than 24 hours is visibly stale and requires all operational sources to be refreshed before review.

The capsule contains synthetic state only. Its digest is not a digital identity signature, and it does not include map tiles, API keys, server ledger records, live feeds, personal data, or authority to act.

## Current recovery limitations

- GitHub is currently a public source repository; do not commit confidential data.
- The hosted D1 ledger requires a separate export, encrypted backup, retention policy, and observed restore exercise before any real pilot.
- Browser local storage can be cleared by the operating system or user and is not an organizational backup.
- A GitHub ZIP can rebuild the application, but it cannot recreate the same hosted URL, access policy, database content, or secret values by itself.
- Disaster-recovery certification remains blocked until an independent restore exercise measures actual recovery time and recovery-point loss.
