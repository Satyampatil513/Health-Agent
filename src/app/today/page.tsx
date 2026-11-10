"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  DailyCheckIn,
  DailyBrief,
  SessionFeedback,
  UserContract,
  WeeklyBlock,
} from "@/types/schema";
import {
  getCheckInForDate,
  getLatestWeeklyBlock,
  getUserContract,
  getDailyBrief,
  saveDailyBrief,
  getBaselineDiet,
  saveSessionFeedback,
  getSessionFeedbacks,
} from "@/lib/storage";
import { todayISO } from "@/lib/date";
import { computeConstraintState, type ConstraintResult } from "@/lib/constraintCompiler";
import { tiers } from "@/config/tiers";
import { redFlagRules } from "@/config/redFlags";

type LoadState = "loading" | "generating" | "ready" | "error";

export default function TodayPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [contract, setContract] = useState<UserContract | null>(null);
  const [checkIn, setCheckIn] = useState<DailyCheckIn | undefined>();
  const [weeklyBlock, setWeeklyBlock] = useState<WeeklyBlock | undefined>();
  const [constraintResult, setConstraintResult] = useState<ConstraintResult | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null);

  const date = todayISO();

  const generateBrief = useCallback(
    async (c: UserContract, wb: WeeklyBlock, ci: DailyCheckIn, cr: ConstraintResult) => {
      setLoadState("generating");
      setError(null);
      try {
        const baselineDiet = getBaselineDiet();
        const res = await fetch("/api/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract: c,
            weeklyBlock: wb,
            checkIn: ci,
            appliedTier: cr.tier,
            baselineDiet,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error((errData.error as string) ?? `HTTP ${res.status}`);
        }
        const data: DailyBrief = await res.json() as DailyBrief;
        saveDailyBrief(data);
        setBrief(data);
        setLoadState("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoadState("error");
      }
    },
    []
  );

  useEffect(() => {
    const c = getUserContract();
    const ci = getCheckInForDate(date);
    const wb = getLatestWeeklyBlock();

    setContract(c);
    setCheckIn(ci);
    setWeeklyBlock(wb);

    if (!c || !wb || !ci) {
      setLoadState("ready");
      return;
    }

    const cr = computeConstraintState({ contract: c, checkIn: ci, baselineTier: wb.tier, tiers, redFlagRules });
    setConstraintResult(cr);

    const existingFb = getSessionFeedbacks().find((f) => f.date === date);
    if (existingFb) setSessionFeedback(existingFb);

    const cached = getDailyBrief(date);
    if (cached) {
      setBrief(cached);
      setLoadState("ready");
      return;
    }

    generateBrief(c, wb, ci, cr);
  }, [date, generateBrief]);

  function logFeedback(completion: SessionFeedback["completion"], difficulty?: SessionFeedback["difficulty"]) {
    const fb: SessionFeedback = { date, sessionId: `session-${date}`, completion, difficulty };
    saveSessionFeedback(fb);
    setSessionFeedback(fb);
  }

  if (loadState === "loading" || loadState === "generating") {
    return (
      <div>
        <h1>Today</h1>
        <p className="subtitle">{date}</p>
        <div className="card">
          <p className="muted" style={{ textAlign: "center", padding: "24px 0" }}>
            {loadState === "generating" ? "Generating your plan…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  if (!contract) return (
    <div className="empty-state">
      <p>Complete intake first — your medical baseline is needed.</p>
      <div style={{ marginTop: 16 }}><a href="/intake" className="btn btn-primary">Go to intake</a></div>
    </div>
  );

  if (!weeklyBlock) return (
    <div className="empty-state">
      <p>No weekly block set yet.</p>
      <div style={{ marginTop: 16 }}><a href="/weekly-block" className="btn btn-primary">Set weekly block</a></div>
    </div>
  );

  if (!checkIn) return (
    <div className="empty-state">
      <p>No check-in yet today — the plan depends on it.</p>
      <div style={{ marginTop: 16 }}><a href="/checkin" className="btn btn-primary">Do today&apos;s check-in</a></div>
    </div>
  );

  if (loadState === "error") return (
    <div>
      <h1>Today</h1>
      <div className="banner banner-danger">
        <strong>Could not generate plan.</strong>
        <p style={{ marginTop: 8, fontSize: "0.9rem" }}>{error}</p>
      </div>
      <button className="btn btn-primary" onClick={() => constraintResult && generateBrief(contract, weeklyBlock, checkIn, constraintResult)}>
        Retry
      </button>
    </div>
  );

  if (brief?.flags?.includes("red_flag_triggered") || constraintResult?.escalated) {
    return (
      <div>
        <h1>Today</h1>
        <p className="subtitle">{date}</p>
        <div className="banner banner-danger">
          <strong>Plan paused.</strong>
          <p style={{ marginTop: 8 }}>{brief?.coachNote ?? constraintResult?.guidanceText}</p>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const tierDef = tiers.find((t) => t.tier === (constraintResult?.tier ?? weeklyBlock.tier));

  return (
    <div>
      <h1>Today</h1>
      <p className="subtitle">{date}</p>

      <div className="card">
        <span className="badge">Tier {constraintResult?.tier ?? weeklyBlock.tier} — {tierDef?.label ?? "Unknown"}</span>
        <p style={{ marginTop: 10, fontWeight: 600 }}>{brief.headline}</p>
        {constraintResult && constraintResult.tier < weeklyBlock.tier && (
          <p className="hint" style={{ marginTop: 6 }}>
            Stepped down from baseline tier {weeklyBlock.tier}
            {constraintResult.clearanceLocked.length > 0 ? ` — missing clearance for: ${constraintResult.clearanceLocked.join(", ")}` : ""}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Movement</h2>
        {brief.movementBlock.exercises.length === 0 ? (
          <p className="muted">Rest today — no movement prescribed.</p>
        ) : (
          <ul className="list-plain">
            {brief.movementBlock.exercises.map((ex) => (
              <li key={ex.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontWeight: 600 }}>{ex.name}</span>
                  <span className="muted" style={{ fontSize: "0.9rem" }}>{ex.sets}×{ex.reps}</span>
                </div>
                <p className="hint" style={{ marginBottom: 0 }}>{ex.cue}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {brief.movementBlock.exercises.length > 0 && (
        <div className="card">
          <h2>How did the session go?</h2>
          {sessionFeedback ? (
            <p className="muted">Logged: {sessionFeedback.completion}{sessionFeedback.difficulty ? ` · ${sessionFeedback.difficulty}` : ""}</p>
          ) : (
            <div className="tap-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              {(["full", "partial", "skipped"] as const).map((c) => (
                <button key={c} type="button" className="tap-option" onClick={() => logFeedback(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>Fueling</h2>
        {brief.fuelingBlock.meals.length === 0 ? (
          <p className="muted">Normal nutrition today.</p>
        ) : (
          <>
            <ul className="list-plain">
              {brief.fuelingBlock.meals.map((meal) => (
                <li key={meal.slot} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{meal.slot}</span>
                    <span className="muted" style={{ fontSize: "0.9rem" }}>{meal.proteinG}g protein</span>
                  </div>
                  <p className="hint" style={{ marginBottom: 0 }}>{meal.suggestion}</p>
                </li>
              ))}
            </ul>
            {brief.fuelingBlock.proteinGapNote && (
              <p className="hint" style={{ marginTop: 12 }}>{brief.fuelingBlock.proteinGapNote}</p>
            )}
          </>
        )}
      </div>

      {brief.coachNote && (
        <div className="card">
          <h2>Coach note</h2>
          <p>{brief.coachNote}</p>
        </div>
      )}

      <button
        type="button"
        className="btn"
        style={{ marginTop: 8 }}
        onClick={() => {
          if (constraintResult) {
            setBrief(null);
            generateBrief(contract, weeklyBlock, checkIn, constraintResult);
          }
        }}
      >
        Regenerate plan
      </button>
    </div>
  );
}
