import { getD1 } from "../db/index.ts";
import { parseAuthorityTrustRegistry } from "./authority-event.ts";
import type { AssuranceRuntimeState } from "./assurance.ts";

async function runtimeEnvironment() {
  try {
    const runtimeModule = await import("cloudflare:workers");
    return runtimeModule.env as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function tableReady(db: D1Database, table: string) {
  try {
    await db.prepare(`SELECT 1 AS ready FROM ${table} LIMIT 1`).first();
    return true;
  } catch {
    return false;
  }
}

export async function inspectAssuranceRuntime(): Promise<AssuranceRuntimeState> {
  const env = await runtimeEnvironment();
  const registry = parseAuthorityTrustRegistry(env.AUTHORITY_TRUST_REGISTRY_JSON);
  let replayStoreReady = false;
  let durableLedgerReady = false;
  try {
    const db = await getD1();
    [replayStoreReady, durableLedgerReady] = await Promise.all([
      tableReady(db, "authority_event_receipts"),
      tableReady(db, "regional_runs"),
    ]);
  } catch {
    // Readiness is intentionally false when the durable binding cannot be proven.
  }
  return {
    authorityRegistryConfigured: registry.keys.length > 0,
    replayStoreReady,
    durableLedgerReady,
  };
}

export async function readAuthorityTrustRegistry() {
  const env = await runtimeEnvironment();
  return parseAuthorityTrustRegistry(env.AUTHORITY_TRUST_REGISTRY_JSON);
}
