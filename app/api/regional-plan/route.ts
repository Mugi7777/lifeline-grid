import {
  buildRegionalPlanResult,
  parseRegionalPlanRequest,
  readBoundedJson,
  regionalJson,
} from "../../../lib/regional-contract";

export async function POST(request: Request) {
  const decoded = await readBoundedJson(request);
  if (!decoded.ok) return regionalJson(decoded.body, decoded.status);
  const parsed = parseRegionalPlanRequest(decoded.value);
  if (!parsed.ok) return regionalJson(parsed.body, parsed.status);

  try {
    return regionalJson(await buildRegionalPlanResult(parsed.value));
  } catch (error) {
    return regionalJson({
      error: "planning_failed",
      message: error instanceof Error ? error.message : "Unknown planning error",
    }, 422);
  }
}
