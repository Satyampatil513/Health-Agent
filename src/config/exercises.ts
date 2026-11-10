// Exercise catalog — id/name/description lookup for the ids referenced by
// TierDefinition.allowedExerciseIds (config/tiers.ts).
//
// This is a generic, cuisine/sport/condition-agnostic starter set of low-risk
// mobility and bodyweight-strength movements, ordered roughly by demand. It
// exists so v0 has something concrete to render in the Today loop. It is NOT
// clinically reviewed. Per the build plan (section 8 v0 exit criteria and
// section 10), the tier→exercise mapping must be signed off by a clinician
// before this is used for anyone's real training — treat this file as a
// placeholder to review/replace, not a decision.
//
// The LLM never invents movements outside this whitelist (section 3, "hard
// rule"); this file plus config/tiers.ts is the entire whitelist.

export interface Exercise {
  id: string;
  name: string;
  description: string;
}

export const exercises: Exercise[] = [
  {
    id: "diaphragmatic-breathing",
    name: "Diaphragmatic breathing",
    description: "Lying down, breathe into the belly, slow and controlled. 5 minutes.",
  },
  {
    id: "supine-pelvic-tilt",
    name: "Supine pelvic tilt",
    description: "Lying on back, knees bent, gently flatten and arch the lower back.",
  },
  {
    id: "cat-cow",
    name: "Cat-cow",
    description: "On hands and knees, alternate arching and rounding the spine, slow.",
  },
  {
    id: "ankle-pumps",
    name: "Ankle pumps",
    description: "Seated or lying, flex and point the feet.",
  },
  {
    id: "glute-bridge",
    name: "Glute bridge",
    description: "Lying on back, knees bent, lift hips, squeeze glutes, lower slowly.",
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    description: "On hands and knees, extend opposite arm and leg, hold, switch sides.",
  },
  {
    id: "wall-sit",
    name: "Wall sit",
    description: "Back against a wall, knees bent to a comfortable angle, hold.",
  },
  {
    id: "standing-row-band",
    name: "Standing band row",
    description: "Resistance band anchored in front, pull elbows back, squeeze shoulder blades.",
  },
  {
    id: "walking-easy",
    name: "Easy walk",
    description: "Flat ground, conversational pace.",
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight squat",
    description: "Feet shoulder-width, sit back and down, controlled depth, stand.",
  },
  {
    id: "incline-pushup",
    name: "Incline push-up",
    description: "Hands on a raised surface (counter/bench), lower chest, push back up.",
  },
  {
    id: "step-up",
    name: "Step-up",
    description: "Step onto a low, stable surface, drive through the lead leg, step down with control.",
  },
  {
    id: "plank-hold",
    name: "Plank hold",
    description: "Forearms and toes, straight line from shoulders to ankles, hold.",
  },
];

export function getExercise(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}
