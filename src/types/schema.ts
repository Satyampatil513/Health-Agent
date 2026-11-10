// Data schema — source of truth from health-agent-build-plan.md section 4.
// The data layer is built to match these interfaces even though v0 has no LLM
// layers yet, since v1/v2 read and write the same structures.

// ---------------------------------------------------------------------------
// 4.1 Intake — UserContract
// ---------------------------------------------------------------------------

/** Captured once at intake. Revisited only on explicit user-initiated update. */
export interface UserContract {
  id: string;
  createdAt: string;
  updatedAt: string;

  medical: {
    diagnosedConditions: Condition[];
    /** free text, mapped to RedFlagRule config by name matching or manual review */
    activeRedFlags: string[];
    currentClearances: Clearance[];
    medications: string[];
    symptomBaseline: {
      description: string;
      /** 0-10 */
      painScoreAtIntake: number;
    };
  };

  goals: {
    primary: { text: string; targetDate?: string };
    secondary: { text: string }[];
    /** free text, in the user's own words */
    definitionOfSuccess: string;
  };
}

export interface Condition {
  name: string;
  diagnosedDate?: string;
  /** e.g. link to an uploaded report */
  sourceDocument?: string;
  severity?: "mild" | "moderate" | "severe";
}

export interface Clearance {
  /** "running", "contact sport", "heavy lifting", etc. */
  activityType: string;
  cleared: boolean;
  /** must be a professional identifier — "self" is not valid for sport-level clearance */
  clearedBy?: string;
  clearedAt?: string;
  /** date this clearance should be re-checked */
  reviewBy?: string;
}

// ---------------------------------------------------------------------------
// 4.2 Daily input — DailyCheckIn
// ---------------------------------------------------------------------------

/** The entire daily interaction. Target: under 20 seconds, four taps. */
export interface DailyCheckIn {
  date: string;
  /** ordinal; condition-specific labels map to 0..N in config */
  symptomExtent: number;
  /** 0-10 */
  painScore: number;
  trendVsYesterday: "better" | "same" | "worse";
  /** single yes/no gate; "yes" expands to a detail field */
  redFlagTriggered: boolean;
  redFlagDetail?: string;
}

// ---------------------------------------------------------------------------
// 4.3 Learned state — ProfileMemory
// ---------------------------------------------------------------------------

/**
 * The only place "learned" facts about the person live. Nothing here is asked
 * directly except where noted — it's built from observed behavior.
 *
 * Not read or written anywhere in v0 (no Planner/Composer feedback loop yet —
 * that's v2). Defined now so the v1/v2 data layer doesn't need a rewrite.
 */
export interface ProfileMemory {
  userId: string;

  adherence: {
    plannedSessions: number;
    completedSessions: number;
    last7dRate: number;
    last28dRate: number;
    /** completion rate 0-1 per weekday */
    dropoffByWeekday: Record<string, number>;
  };

  capacityTrend: {
    /** e.g. "bodyweight squat reps", "plank hold seconds" */
    metric: string;
    history: { date: string; value: number }[];
  }[];

  nutritionPattern: {
    dietType?: "vegetarian" | "eggetarian" | "non-veg" | "vegan" | "other";
    /** set via the one contextual micro-ask, not intake */
    dietTypeSetAt?: string;
    acceptedMealsSample: string[];
    rejectedMealsSample: string[];
    proteinGapTrend: { date: string; gapGrams: number }[];
  };

  context: {
    equipmentAccess?: "none" | "home basic" | "gym";
    /** set via contextual micro-ask, first time a plan needs it */
    equipmentSetAt?: string;
    typicalActiveWindow?: string;
  };

  behavioralNotes: {
    /** learned: plans over N items get abandoned */
    maxSustainableSessionComplexity?: number;
    preferredComplexity?: "minimal" | "moderate" | "detailed";
  };
}

// ---------------------------------------------------------------------------
// 4.4 Planner output — WeeklyBlock
// ---------------------------------------------------------------------------

export interface WeeklyBlock {
  weekOf: string;
  /** from Constraint Compiler — read-only input to the Planner, not chosen by it */
  tier: number;
  trainingDaysTarget: number;
  proteinTargetGPerKg: number;
  sleepTargetHours: number;
  deload: boolean;
  /** short label, e.g. "return to load, phase 2" */
  focus: string;
  /** shown to the user in plain language */
  rationale: string;
}

// ---------------------------------------------------------------------------
// 4.5 Composer output — DailyPlan
// ---------------------------------------------------------------------------

export interface DailyPlan {
  date: string;
  tierApplied: number;
  /** ids must exist in the whitelist */
  exercises: { id: string; sets: number; reps: string; notes?: string }[];
  meals: { slot: string; suggestion: string; proteinG: number }[];
  rationale: string;
  /** true if a red flag fired and this plan was replaced with guidance */
  escalated: boolean;
}

// ---------------------------------------------------------------------------
// 4.6 Adapter — on-demand replanning
// ---------------------------------------------------------------------------

export interface AdapterRequest {
  date: string;
  /** "20 minutes, no equipment, skipped lunch" */
  freeTextConstraint: string;
}

export interface AdapterResponse {
  revisedPlan: DailyPlan;
  toolCallsUsed: string[];
}

// ---------------------------------------------------------------------------
// 4.7 Config — clinician/owner-controlled, never written by the LLM
// ---------------------------------------------------------------------------

export interface TierDefinition {
  tier: number;
  label: string;
  allowedExerciseIds: string[];
  /** activity types gated at this tier */
  requiresClearanceFor?: string[];
}

export interface RedFlagRule {
  conditionName: string;
  questionText: string;
  onTrigger: "block_and_show_guidance";
  guidanceText: string;
}

// --- v1 additions ---

export interface BaselineDiet {
  typicalBreakfast: string;
  typicalMainMeals: string;
  typicalSnacksAndBetweenMeals: string;
  parsedAt: string;
  estimatedProteinGPerDay?: number;
  cuisineStyleTags?: string[];
}

export interface MovementContraindicationRule {
  conditionName: string;
  tierRange: [number, number];
  forbiddenPattern: string;
  reason: string;
}

export interface ExerciseProposal {
  id: string;
  name: string;
  movementPattern: "squat" | "hinge" | "push" | "pull" | "carry" | "rotation" | "gait" | "isometric" | "mobility";
  directionalBias?: "flexion" | "extension" | "neutral";
  sets: number;
  reps: string;
  cue: string;
  rationale: string;
}

export interface DailyBrief {
  date: string;
  headline: string;
  movementBlock: {
    exercises: { id: string; name: string; sets: number; reps: string; cue: string }[];
  };
  fuelingBlock: {
    meals: { slot: string; suggestion: string; proteinG: number }[];
    proteinGapNote?: string;
  };
  coachNote: string;
  flags: string[];
  generatedAt: string;
}

export interface SessionFeedback {
  date: string;
  sessionId: string;
  completion: "full" | "partial" | "skipped";
  difficulty?: "too easy" | "right" | "too hard";
  skippedReason?: "no time" | "no equipment" | "pain" | "not motivated" | "other";
}
