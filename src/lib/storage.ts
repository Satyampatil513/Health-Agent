// Local storage persistence — v0 scope only (build plan section 8: "Local
// storage only", no backend). v1 swaps this for Supabase without touching
// the interfaces in types/schema.ts.

import type { DailyCheckIn, UserContract, WeeklyBlock, DailyBrief, BaselineDiet, SessionFeedback } from "@/types/schema";

const KEYS = {
  contract: "health-agent:contract",
  checkIns: "health-agent:checkins",
  weeklyBlocks: "health-agent:weekly-blocks",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// --- UserContract -----------------------------------------------------------

export function getUserContract(): UserContract | null {
  return read<UserContract>(KEYS.contract);
}

export function saveUserContract(contract: UserContract): void {
  write(KEYS.contract, contract);
}

// --- DailyCheckIn -------------------------------------------------------------

export function getCheckIns(): DailyCheckIn[] {
  return read<DailyCheckIn[]>(KEYS.checkIns) ?? [];
}

export function getCheckInForDate(date: string): DailyCheckIn | undefined {
  return getCheckIns().find((c) => c.date === date);
}

export function saveCheckIn(checkIn: DailyCheckIn): void {
  const all = getCheckIns().filter((c) => c.date !== checkIn.date);
  all.push(checkIn);
  all.sort((a, b) => a.date.localeCompare(b.date));
  write(KEYS.checkIns, all);
}

// --- WeeklyBlock ----------------------------------------------------------

function getWeeklyBlocks(): Record<string, WeeklyBlock> {
  return read<Record<string, WeeklyBlock>>(KEYS.weeklyBlocks) ?? {};
}

export function getWeeklyBlock(weekOf: string): WeeklyBlock | undefined {
  return getWeeklyBlocks()[weekOf];
}

export function saveWeeklyBlock(block: WeeklyBlock): void {
  const all = getWeeklyBlocks();
  all[block.weekOf] = block;
  write(KEYS.weeklyBlocks, all);
}

/** Most recently defined WeeklyBlock, regardless of week — v0 has no Planner
 *  to generate a fresh one weekly, so the last manually-set block carries
 *  forward until edited again. */
export function getLatestWeeklyBlock(): WeeklyBlock | undefined {
  const all = Object.values(getWeeklyBlocks());
  if (all.length === 0) return undefined;
  return all.sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
}

// --- DailyBrief ---
export function getDailyBrief(date: string): DailyBrief | undefined {
  return (read<Record<string, DailyBrief>>("health-agent:briefs") ?? {})[date];
}
export function saveDailyBrief(brief: DailyBrief): void {
  const all = read<Record<string, DailyBrief>>("health-agent:briefs") ?? {};
  all[brief.date] = brief;
  write("health-agent:briefs", all);
}

// --- BaselineDiet ---
export function getBaselineDiet(): BaselineDiet | null {
  return read<BaselineDiet>("health-agent:baseline-diet");
}
export function saveBaselineDiet(diet: BaselineDiet): void {
  write("health-agent:baseline-diet", diet);
}

// --- SessionFeedback ---
export function getSessionFeedbacks(): SessionFeedback[] {
  return read<SessionFeedback[]>("health-agent:session-feedbacks") ?? [];
}
export function saveSessionFeedback(fb: SessionFeedback): void {
  const all = getSessionFeedbacks().filter(
    (f) => !(f.date === fb.date && f.sessionId === fb.sessionId)
  );
  all.push(fb);
  write("health-agent:session-feedbacks", all);
}
