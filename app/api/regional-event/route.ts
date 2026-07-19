const roadIds = [
  "hub-west",
  "hub-center",
  "west-center",
  "west-north",
  "center-north",
  "north-remote",
  "center-east",
  "east-remote",
  "east-clinic",
  "center-south",
  "south-clinic",
  "center-clinic",
] as const;

const regionalEventSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event_type", "road_segment_id", "restriction", "confidence", "source_quote", "operator_summary", "assumptions"],
  properties: {
    event_type: { type: "string", enum: ["inspection_restriction", "road_closure", "weight_restriction"] },
    road_segment_id: { type: "string", enum: roadIds },
    restriction: { type: "string", enum: ["closed", "weight_limited", "inspection_required"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    source_quote: { type: "string" },
    operator_summary: { type: "string" },
    assumptions: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
} as const;

const FALLBACK_EVENT = {
  eventType: "inspection_restriction",
  roadSegmentId: "center-north",
  restriction: "closed",
  confidence: 0.98,
  sourceQuote: "North Forest Road is closed pending a structural inspection",
  operatorSummary: "North Forest Road is unavailable for the current planning window.",
  assumptions: ["The closure remains active until a road authority clears the segment"],
};

function demoResponse(reason: "no-key" | "api-unavailable") {
  return Response.json({ mode: "demo-fallback", reason, model: "gpt-5.6", event: FALLBACK_EVENT });
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
      const value = (part as { text?: unknown }).text;
      if (typeof value === "string") return value;
    }
  }
  return null;
}

export async function POST(request: Request) {
  let report = "Road authority note: North Forest Road is closed pending a structural inspection. Heavy community vehicles must use alternate routes.";
  try {
    const body = await request.json() as { report?: unknown };
    if (typeof body.report === "string" && body.report.trim()) report = body.report.slice(0, 4_000);
  } catch {
    // Keep the fictional deterministic fallback available for the product demonstration.
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return demoResponse("no-key");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 1_000,
        instructions: [
          "Convert a fictional Japanese rural road inspection note into one machine-readable road event.",
          "Use only a road identifier supported by the schema and only when the report names or unambiguously describes it.",
          "Preserve a short source quote and keep uncertainty in assumptions.",
          "Do not calculate routes, diagnose structural safety, or authorize a closure.",
          "This is a synthetic planning demonstration; a road authority remains responsible.",
        ].join(" "),
        input: report,
        text: {
          format: {
            type: "json_schema",
            name: "regional_road_event",
            strict: true,
            schema: regionalEventSchema,
          },
        },
      }),
    });
    if (!response.ok) return demoResponse("api-unavailable");
    const outputText = readOutputText(await response.json());
    if (!outputText) return demoResponse("api-unavailable");
    const parsed = JSON.parse(outputText) as {
      event_type?: string;
      road_segment_id?: string;
      restriction?: string;
      confidence?: number;
      source_quote?: string;
      operator_summary?: string;
      assumptions?: string[];
    };
    if (!roadIds.includes(parsed.road_segment_id as (typeof roadIds)[number])) return demoResponse("api-unavailable");
    return Response.json({
      mode: "gpt-5.6",
      model: "gpt-5.6",
      event: {
        eventType: parsed.event_type,
        roadSegmentId: parsed.road_segment_id,
        restriction: parsed.restriction,
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
