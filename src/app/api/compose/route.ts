import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserContract, WeeklyBlock, DailyCheckIn, DailyBrief } from "@/types/schema";
import { getActiveContraindications } from "@/config/contraindications";

const PRIMARY_MODEL = "gemma-3-27b-it";
const FALLBACK_MODEL = "gemini-2.0-flash";

function buildPrompt(params: {
  contract: UserContract;
  weeklyBlock: WeeklyBlock;
  checkIn: DailyCheckIn;
  appliedTier: number;
  baselineDiet: { typicalMainMeals?: string; cuisineStyleTags?: string[]; estimatedProteinGPerDay?: number } | null;
  contraindicationSummary: string;
  bodyweightKg?: number;
}): string {
  const { contract, weeklyBlock, checkIn, appliedTier, baselineDiet } = params;
  const proteinTargetG = Math.round(weeklyBlock.proteinTargetGPerKg * (params.bodyweightKg ?? 70));
  const conditions = contract.medical.diagnosedConditions.map((c) => c.name).join(", ") || "none reported";
  const cuisineHint = baselineDiet?.cuisineStyleTags?.join(", ") || "not specified";

  return `You are a conservative physiotherapy assistant. Generate today's DailyBrief as valid JSON only — no markdown, no explanation.

PERSON:
- Conditions: ${conditions}
- Primary goal: ${contract.goals.primary.text}
- Today's pain score: ${checkIn.painScore}/10
- Today's symptom level: ${checkIn.symptomExtent} (0=none, 4=severe)
- Trend vs yesterday: ${checkIn.trendVsYesterday}

WEEK:
- Tier today: ${appliedTier} (0=rest, 1=gentle mobility, 2=controlled load, 3=progressive training, 4=full activity)
- Focus: ${weeklyBlock.focus || "general recovery"}
- Deload week: ${weeklyBlock.deload ? "yes — reduce volume" : "no"}
- Protein target: ${proteinTargetG}g/day
- Sleep target: ${weeklyBlock.sleepTargetHours}h

FORBIDDEN MOVEMENT PATTERNS (never prescribe these):
${params.contraindicationSummary || "None configured — use conservative clinical judgment."}

FOOD CONTEXT:
- Cuisine style: ${cuisineHint}
- Estimated typical protein: ${baselineDiet?.estimatedProteinGPerDay ?? "unknown"}g/day

OUTPUT — return ONLY this JSON structure, no other text:
{
  "date": "${checkIn.date}",
  "headline": "Tier ${appliedTier} — [one specific reason from today's check-in]",
  "movementBlock": {
    "exercises": [
      { "id": "unique_snake_case_id", "name": "Exercise Name", "sets": 3, "reps": "10-12", "cue": "single most important coaching cue for this person's condition" }
    ]
  },
  "fuelingBlock": {
    "meals": [
      { "slot": "breakfast", "suggestion": "specific realistic suggestion", "proteinG": 20 },
      { "slot": "lunch", "suggestion": "...", "proteinG": 35 },
      { "slot": "dinner", "suggestion": "...", "proteinG": 35 }
    ],
    "proteinGapNote": "include only if meals total under ${proteinTargetG}g protein"
  },
  "coachNote": "2-3 sentences referencing today's pain score (${checkIn.painScore}/10) and trend (${checkIn.trendVsYesterday}). Never generic.",
  "flags": [],
  "generatedAt": "${new Date().toISOString()}"
}

TIER RULES:
- Tier 0: empty exercises, rest guidance only
- Tier 1: gentle mobility only — breathing, cat-cow, pelvic tilts, ankle pumps, gentle stretches
- Tier 2: add controlled load — glute bridge, bird-dog, wall sit
- Tier 3: progressive — bodyweight squat, incline pushup, band row, step-up
- Tier 4: full activity, higher volume

Keep exercises to 3-5 items. Each cue must address the person's specific condition and movement needs.`;
}

async function callModel(apiKey: string, modelName: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let body: {
    contract: UserContract;
    weeklyBlock: WeeklyBlock;
    checkIn: DailyCheckIn;
    appliedTier: number;
    baselineDiet: { typicalMainMeals?: string; cuisineStyleTags?: string[]; estimatedProteinGPerDay?: number } | null;
    bodyweightKg?: number;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contract, checkIn, appliedTier } = body;

  // Red flag: skip generation, return rest guidance
  if (checkIn.redFlagTriggered) {
    const brief: DailyBrief = {
      date: checkIn.date,
      headline: "Tier 0 — red flag reported today",
      movementBlock: { exercises: [] },
      fuelingBlock: {
        meals: [],
        proteinGapNote: "Focus on rest. Maintain normal nutrition.",
      },
      coachNote: checkIn.redFlagDetail
        ? `You reported: "${checkIn.redFlagDetail}". Today's activity is paused. Check in with your clinician before resuming.`
        : "You flagged a concern today. Rest, monitor your symptoms, and check in with your clinician before resuming.",
      flags: ["red_flag_triggered"],
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(brief);
  }

  // Build contraindication summary
  const conditionNames = contract.medical.diagnosedConditions.map((c) => c.name);
  const activeRules = getActiveContraindications(conditionNames, appliedTier);
  const contraindicationSummary = activeRules
    .map((r) => `- ${r.forbiddenPattern} (reason: ${r.reason})`)
    .join("\n");

  const prompt = buildPrompt({ ...body, contraindicationSummary });

  let rawText: string;
  try {
    rawText = await callModel(apiKey, PRIMARY_MODEL, prompt);
  } catch {
    try {
      rawText = await callModel(apiKey, FALLBACK_MODEL, prompt);
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return NextResponse.json({ error: `Model call failed: ${msg}` }, { status: 500 });
    }
  }

  let brief: DailyBrief;
  try {
    brief = JSON.parse(rawText) as DailyBrief;
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Model returned non-JSON", raw: rawText.slice(0, 500) }, { status: 500 });
    }
    try {
      brief = JSON.parse(match[0]) as DailyBrief;
    } catch {
      return NextResponse.json({ error: "Could not parse model JSON" }, { status: 500 });
    }
  }

  // Ensure required fields
  brief.date = checkIn.date;
  brief.generatedAt = new Date().toISOString();
  if (!Array.isArray(brief.flags)) brief.flags = [];
  if (!brief.movementBlock?.exercises) brief.movementBlock = { exercises: [] };
  if (!brief.fuelingBlock?.meals) brief.fuelingBlock = { meals: [] };

  return NextResponse.json(brief);
}
