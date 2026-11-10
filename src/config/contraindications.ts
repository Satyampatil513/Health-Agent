// Movement contraindication rules — clinician-authored, never LLM-authored.
// Empty by design — fill per condition with clinician input.
import type { MovementContraindicationRule } from "@/types/schema";

export const contraindicationRules: MovementContraindicationRule[] = [];

export function getActiveContraindications(
  conditionNames: string[],
  tier: number
): MovementContraindicationRule[] {
  return contraindicationRules.filter(
    (r) =>
      conditionNames.some((n) => n.toLowerCase() === r.conditionName.toLowerCase()) &&
      tier >= r.tierRange[0] &&
      tier <= r.tierRange[1]
  );
}
