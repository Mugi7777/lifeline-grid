import {
  buildDataTrustEvidence,
  evaluateOperationalData,
  parseOperationalDataBundle,
} from "../../../lib/data-trust.ts";
import { readBoundedJson, regionalJson } from "../../../lib/regional-contract.ts";

export async function POST(request: Request) {
  const decoded = await readBoundedJson(request);
  if (!decoded.ok) return regionalJson(decoded.body, decoded.status);
  const parsed = parseOperationalDataBundle(decoded.value);
  if (!parsed.ok) return regionalJson(parsed, 422);

  const evaluated = evaluateOperationalData(parsed.value, Date.now());
  const transportBlocker = "Public validation input is not an authenticated adapter attestation.";
  const evaluation = {
    ...evaluated,
    decisionGate: "blocked" as const,
    blockers: [...evaluated.blockers, transportBlocker],
    nextAction: "Validate the bundle through an authenticated, server-owned adapter before consequential human review.",
  };
  return regionalJson({
    evaluation,
    evidence: await buildDataTrustEvidence(parsed.value, evaluation),
    advisoryOnly: true,
    transportTrust: "untrusted_public_validation",
  });
}
