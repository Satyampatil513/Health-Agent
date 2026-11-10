// Constraint Compiler — deterministic code, no LLM (build plan section 5).
// Runs before every Planner/Composer/Adapter invocation. This is the safety
// floor: it is the only thing that sets tier and clearance state.
//
// v0 scope, deliberately narrow: this file decides today's *applied* tier
// from (a) a clinician/self-set baseline ceiling tier stored on the
// WeeklyBlock, (b) today's red-flag check, and (c) clearance gating. It does
// NOT grade tier up/down from painScore/symptomExtent/trend trends — that is
// real clinical judgment, explicitly flagged as an open decision in the
// build plan (sections 9 and 10: "a wrong guess has real consequences").
// Wiring that up is a TODO for clinician review, not something to infer here.

import type {
  Clearance,
  DailyCheckIn,
  RedFlagRule,
  TierDefinition,
  UserContract,
} from "@/types/schema";
import { genericRedFlagGuidance, matchRedFlagRule } from "@/config/redFlags";

export interface ConstraintResult {
  tier: number;
  escalated: boolean;
  guidanceText?: string;
  /** activity types locked at the ceiling tier for lack of a valid Clearance */
  clearanceLocked: string[];
}

const SELF_REFERENTIAL = new Set(["self", "me", "myself", "i did"]);

/**
 * Clearance is a one-way gate the LLM cannot open (section 5). A clearance is
 * only valid if it was set by an identified professional, is marked cleared,
 * and hasn't passed its review date.
 */
export function isClearanceValid(clearance: Clearance, today = new Date()): boolean {
  if (!clearance.cleared) return false;
  const by = clearance.clearedBy?.trim().toLowerCase();
  if (!by || SELF_REFERENTIAL.has(by)) return false;
  if (clearance.reviewBy) {
    const reviewDate = new Date(clearance.reviewBy);
    if (!Number.isNaN(reviewDate.getTime()) && reviewDate < today) return false;
  }
  return true;
}

function hasValidClearanceFor(activityType: string, clearances: Clearance[]): boolean {
  return clearances.some((c) => c.activityType === activityType && isClearanceValid(c));
}

/** Highest tier reachable given clearance state — caps at the first tier (by
 * ascending tier number) whose requiresClearanceFor lists an activity type
 * the user isn't validly cleared for. */
function clearanceCap(
  ceilingTier: number,
  tiers: TierDefinition[],
  clearances: Clearance[],
): { cap: number; locked: string[] } {
  const sorted = [...tiers].sort((a, b) => a.tier - b.tier);
  const locked: string[] = [];
  for (const def of sorted) {
    if (def.tier > ceilingTier) break;
    const missing = (def.requiresClearanceFor ?? []).filter(
      (activity) => !hasValidClearanceFor(activity, clearances),
    );
    if (missing.length > 0) {
      locked.push(...missing);
      return { cap: def.tier - 1, locked };
    }
  }
  return { cap: ceilingTier, locked };
}

export function computeConstraintState(params: {
  contract: UserContract;
  checkIn: DailyCheckIn | undefined;
  /** ceiling tier set on the current WeeklyBlock by the clinician/self, not
   *  chosen by the LLM */
  baselineTier: number;
  tiers: TierDefinition[];
  redFlagRules?: RedFlagRule[];
}): ConstraintResult {
  const { contract, checkIn, baselineTier, tiers } = params;

  if (checkIn?.redFlagTriggered) {
    const conditionNames = contract.medical.diagnosedConditions.map((c) => c.name);
    const matched = matchRedFlagRule(conditionNames);
    return {
      tier: 0,
      escalated: true,
      guidanceText: matched?.guidanceText ?? genericRedFlagGuidance,
      clearanceLocked: [],
    };
  }

  const { cap, locked } = clearanceCap(
    baselineTier,
    tiers,
    contract.medical.currentClearances,
  );

  return {
    tier: Math.max(0, cap),
    escalated: false,
    clearanceLocked: locked,
  };
}
