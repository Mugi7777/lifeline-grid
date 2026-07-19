import { DEFAULT_NEEDS, type PowerNeed } from "@/lib/planner";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["needs"],
  properties: {
    needs: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "facility",
          "summary",
          "power_kw",
          "duration_hours",
          "deadline_minutes",
          "priority",
          "connector",
          "confidence",
          "assumptions",
          "source_quote",
        ],
        properties: {
          id: { type: "string", enum: ["clinic", "shelter", "water"] },
          facility: { type: "string" },
          summary: { type: "string" },
          power_kw: { type: "number", minimum: 0.1, maximum: 50 },
          duration_hours: { type: "number", minimum: 0.25, maximum: 72 },
          deadline_minutes: { type: "integer", minimum: 1, maximum: 1440 },
          priority: { type: "string", enum: ["critical", "high", "standard"] },
          connector: { type: "string", enum: ["V2L", "V2H", "V2B"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          assumptions: { type: "array", items: { type: "string" }, maxItems: 4 },
          source_quote: { type: "string" },
        },
      },
    },
  },
} as const;

type ModelNeed = {
  id: PowerNeed["id"];
  facility: string;
  summary: string;
  power_kw: number;
  duration_hours: number;
  deadline_minutes: number;
  priority: PowerNeed["priority"];
  connector: PowerNeed["connector"];
  confidence: number;
  assumptions: string[];
  source_quote: string;
};

function demoResponse(reason: "no-key" | "api-unavailable") {
  return Response.json({
    mode: "demo-fallback",
    reason,
    model: "gpt-5.6",
    needs: DEFAULT_NEEDS,
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
  let reports = DEFAULT_NEEDS.map((need) => `${need.id}: ${need.report}`).join("\n");
  try {
    const body = await request.json() as { reports?: unknown };
    if (typeof body.reports === "string" && body.reports.trim()) {
      reports = body.reports.slice(0, 8_000);
    }
  } catch {
    // The deterministic synthetic scenario remains available when the request body is malformed.
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
        reasoning: { effort: "none" },
        max_output_tokens: 2_000,
        instructions: [
          "You convert fictional disaster reports into machine-readable temporary power needs.",
          "Extract only facts supported by the reports. Put any necessary inference in assumptions.",
          "This is a synthetic training simulation, not medical advice and not authorization to dispatch.",
          "Return exactly one need for each id: clinic, shelter, water.",
        ].join(" "),
        input: reports,
        text: {
          format: {
            type: "json_schema",
            name: "power_need_contracts",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) return demoResponse("api-unavailable");
    const payload = await response.json();
    const outputText = readOutputText(payload);
    if (!outputText) return demoResponse("api-unavailable");
    const parsed = JSON.parse(outputText) as { needs?: ModelNeed[] };
    if (!Array.isArray(parsed.needs) || parsed.needs.length !== 3) {
      return demoResponse("api-unavailable");
    }

    const baseById = new Map(DEFAULT_NEEDS.map((need) => [need.id, need]));
    const needs = parsed.needs.map((need) => {
      const base = baseById.get(need.id);
      if (!base) throw new Error("Unknown need id");
      return {
        ...base,
        facility: need.facility,
        summary: need.summary,
        powerKw: need.power_kw,
        durationHours: need.duration_hours,
        deadlineMinutes: need.deadline_minutes,
        priority: need.priority,
        connector: need.connector,
        confidence: need.confidence,
        assumptions: need.assumptions,
        sourceQuote: need.source_quote,
      } satisfies PowerNeed;
    });

    return Response.json({ mode: "gpt-5.6", model: "gpt-5.6", needs });
  } catch {
    return demoResponse("api-unavailable");
  }
}
