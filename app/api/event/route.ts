const eventSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event_type", "blocked_route_ids", "confidence", "source_quote", "operator_summary", "assumptions"],
  properties: {
    event_type: { type: "string", enum: ["route_closure", "vehicle_failure", "demand_change"] },
    blocked_route_ids: {
      type: "array",
      items: { type: "string", enum: ["east-bridge", "river-road", "north-link", "ridge-bypass"] },
      maxItems: 4,
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    source_quote: { type: "string" },
    operator_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
} as const;

const FALLBACK_EVENT = {
  eventType: "route_closure",
  blockedRouteIds: ["east-bridge"],
  confidence: 0.99,
  sourceQuote: "East Bridge is closed to all traffic",
  operatorSummary: "East Bridge closure invalidates the active water-station route.",
  assumptions: ["Closure remains active for the re-planning window"],
};

function demoResponse(reason: "no-key" | "api-unavailable") {
  return Response.json({
    mode: "demo-fallback",
    reason,
    model: "gpt-5.6",
    event: FALLBACK_EVENT,
  });
}

function readOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }
  return null;
}

export async function POST(request: Request) {
  let report = "Road operations reports: East Bridge is closed to all traffic after a structural inspection. Use alternate routes until further notice.";
  try {
    const body = await request.json() as { report?: unknown };
    if (typeof body.report === "string" && body.report.trim()) report = body.report.slice(0, 4_000);
  } catch {
    // The transparent fictional fallback keeps the disruption demo operable.
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return demoResponse("no-key");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 1_000,
        instructions: [
          "You convert a fictional disaster operations update into a machine-readable planning event.",
          "Extract only facts supported by the report and preserve a short source quote.",
          "Do not calculate routes, authorize dispatch, or invent unavailable route identifiers.",
          "This is a synthetic training simulation.",
        ].join(" "),
        input: report,
        text: {
          format: {
            type: "json_schema",
            name: "mission_state_event",
            strict: true,
            schema: eventSchema,
          },
        },
      }),
    });

    if (!response.ok) return demoResponse("api-unavailable");
    const payload = await response.json();
    const outputText = readOutputText(payload);
    if (!outputText) return demoResponse("api-unavailable");
    const parsed = JSON.parse(outputText) as {
      event_type?: string;
      blocked_route_ids?: string[];
      confidence?: number;
      source_quote?: string;
      operator_summary?: string;
      assumptions?: string[];
    };
    if (!parsed.blocked_route_ids?.includes("east-bridge")) return demoResponse("api-unavailable");

    return Response.json({
      mode: "gpt-5.6",
      model: "gpt-5.6",
      event: {
        eventType: parsed.event_type,
        blockedRouteIds: parsed.blocked_route_ids,
        confidence: parsed.confidence,
        sourceQuote: parsed.source_quote,
        operatorSummary: parsed.operator_summary,
        assumptions: parsed.assumptions,
      },
    });
  } catch {
    return demoResponse("api-unavailable");
  }
}
