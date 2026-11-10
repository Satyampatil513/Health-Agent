// Tier ladder — config data, not hardcoded logic (build plan section 5).
//
// Tiers are generic (0 rest/red-flag, 1 gentle mobility, 2 controlled load,
// 3 progressive training, 4 full activity/sport). What maps to each tier for
// a *specific* diagnosed condition is meant to be filled in by a clinician —
// this file ships a conservative generic default so v0 has something to run
// end-to-end. It is NOT clinically reviewed. Per section 8, this must be
// reviewed and signed off by a clinician before the exit criteria are met.
//
// The LLM never sets tier and never invents an exercise outside
// allowedExerciseIds (section 3).

import type { TierDefinition } from "@/types/schema";

export const tiers: TierDefinition[] = [
  {
    tier: 0,
    label: "Rest / red flag",
    allowedExerciseIds: [],
  },
  {
    tier: 1,
    label: "Gentle mobility",
    allowedExerciseIds: [
      "diaphragmatic-breathing",
      "supine-pelvic-tilt",
      "cat-cow",
      "ankle-pumps",
    ],
  },
  {
    tier: 2,
    label: "Controlled load",
    allowedExerciseIds: [
      "diaphragmatic-breathing",
      "cat-cow",
      "glute-bridge",
      "bird-dog",
      "wall-sit",
      "walking-easy",
    ],
  },
  {
    tier: 3,
    label: "Progressive training",
    allowedExerciseIds: [
      "glute-bridge",
      "bird-dog",
      "bodyweight-squat",
      "incline-pushup",
      "standing-row-band",
      "step-up",
      "walking-easy",
    ],
  },
  {
    tier: 4,
    label: "Full activity / sport",
    allowedExerciseIds: [
      "bodyweight-squat",
      "incline-pushup",
      "standing-row-band",
      "step-up",
      "plank-hold",
      "walking-easy",
    ],
    // Full activity/sport-specific activity types (e.g. "running", "contact
    // sport") stay locked behind an explicit professional Clearance even at
    // this tier — see Clearance in types/schema.ts and the Constraint
    // Compiler. Fill in per the activityType strings your Clearance records
    // use.
    requiresClearanceFor: ["contact sport", "heavy lifting"],
  },
];

export function getTierDefinition(tier: number): TierDefinition | undefined {
  return tiers.find((t) => t.tier === tier);
}

export const MIN_TIER = 0;
export const MAX_TIER = 4;
