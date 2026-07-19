import { buildAssuranceSnapshot } from "../../../lib/assurance.ts";
import { inspectAssuranceRuntime } from "../../../lib/assurance-runtime.ts";
import { regionalJson } from "../../../lib/regional-contract.ts";

export async function GET() {
  const runtime = await inspectAssuranceRuntime();
  return regionalJson(buildAssuranceSnapshot(runtime));
}
