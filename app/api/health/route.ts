import { buildAssuranceSnapshot } from "../../../lib/assurance.ts";
import { inspectAssuranceRuntime } from "../../../lib/assurance-runtime.ts";
import { regionalJson } from "../../../lib/regional-contract.ts";

export async function GET() {
  const runtime = await inspectAssuranceRuntime();
  const assurance = buildAssuranceSnapshot(runtime);
  return regionalJson({
    status: "ok",
    checkedAt: new Date().toISOString(),
    liveness: "ready",
    operationalReadiness: "prototype_only",
    dependencies: {
      deterministicKernel: "ready",
      durableDecisionLedger: runtime.durableLedgerReady ? "ready" : "unavailable",
      authorityTrustRegistry: runtime.authorityRegistryConfigured ? "configured" : "unconfigured",
      replayProtectionStore: runtime.replayStoreReady ? "ready" : "unavailable",
      reasoningModel: "not_probed_by_health_endpoint",
    },
    safety: assurance.claim,
    release: assurance.release,
  });
}
