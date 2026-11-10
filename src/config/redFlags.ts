// Red-flag rules — config data, not hardcoded logic (build plan section 5).
//
// Each RedFlagRule pairs a condition name with the question the daily
// check-in's single yes/no gate should ask, and the guidance shown if it
// fires. The Constraint Compiler matches rules against the user's
// UserContract.medical.diagnosedConditions.
//
// This file intentionally ships EMPTY. Per the build plan's open decisions
// (section 9): "Exact red-flag rule sets per condition — these need a
// clinician's input per condition type and should not be authored by an LLM
// or assumed generically." Do not fill this in with plausible-sounding
// clinical content — add entries only from real clinician input, one
// condition at a time.
//
// Until a condition has a configured rule, the check-in falls back to the
// generic question/guidance below (see lib/constraintCompiler.ts). That
// fallback is deliberately generic ("stop and seek clinical advice") and
// carries no condition-specific clinical claims.

import type { RedFlagRule } from "@/types/schema";

export const redFlagRules: RedFlagRule[] = [];

/** Shown when the check-in's redFlagTriggered gate fires but no condition-specific
 *  RedFlagRule is configured yet. Generic and non-diagnostic on purpose. */
export const genericRedFlagQuestion =
  "Any new or worsening symptom today that feels like it needs medical attention?";

export const genericRedFlagGuidance =
  "Today's plan has been paused. Based on what you flagged, stop today's planned activity and check in with a clinician before resuming. This app does not diagnose — when in doubt, get it checked.";

export function matchRedFlagRule(
  conditionNames: string[],
): RedFlagRule | undefined {
  return redFlagRules.find((rule) => conditionNames.includes(rule.conditionName));
}
