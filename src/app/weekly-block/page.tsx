"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WeeklyBlock } from "@/types/schema";
import { getLatestWeeklyBlock, getUserContract, saveWeeklyBlock } from "@/lib/storage";
import { startOfWeekISO } from "@/lib/date";
import { tiers } from "@/config/tiers";

export default function WeeklyBlockPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [hasContract, setHasContract] = useState(true);

  const weekOf = startOfWeekISO();
  const [baselineTier, setBaselineTier] = useState(1);
  const [trainingDaysTarget, setTrainingDaysTarget] = useState(3);
  const [proteinTargetGPerKg, setProteinTargetGPerKg] = useState(1.6);
  const [sleepTargetHours, setSleepTargetHours] = useState(8);
  const [deload, setDeload] = useState(false);
  const [focus, setFocus] = useState("");
  const [rationale, setRationale] = useState("");

  useEffect(() => {
    setHasContract(!!getUserContract());
    const existing = getLatestWeeklyBlock();
    if (existing) {
      setBaselineTier(existing.tier);
      setTrainingDaysTarget(existing.trainingDaysTarget);
      setProteinTargetGPerKg(existing.proteinTargetGPerKg);
      setSleepTargetHours(existing.sleepTargetHours);
      setDeload(existing.deload);
      setFocus(existing.focus);
      setRationale(existing.rationale);
    }
    setLoaded(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const block: WeeklyBlock = {
      weekOf,
      tier: baselineTier,
      trainingDaysTarget,
      proteinTargetGPerKg,
      sleepTargetHours,
      deload,
      focus,
      rationale,
    };
    saveWeeklyBlock(block);
    router.push("/today");
  }

  if (!loaded) return null;

  if (!hasContract) {
    return (
      <div className="empty-state">
        <p>Complete intake first — the weekly block needs your medical baseline.</p>
        <div style={{ marginTop: 16 }}>
          <a href="/intake" className="btn btn-primary">
            Go to intake
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Weekly block</h1>
      <p className="subtitle">
        Week of {weekOf}. In v0 there is no Planner yet — this block is set by you or
        your clinician by hand, and carries forward until you change it.
      </p>

      <form onSubmit={handleSubmit} className="stack">
        <section className="card">
          <div className="field">
            <label htmlFor="baselineTier">Baseline tier (ceiling)</label>
            <span className="hint">
              The Constraint Compiler can only move today&apos;s tier down from this —
              e.g. to 0 on a red flag, or lower if a required clearance is missing. It
              never moves it up.
            </span>
            <select
              id="baselineTier"
              value={baselineTier}
              onChange={(e) => setBaselineTier(Number(e.target.value))}
            >
              {tiers.map((t) => (
                <option key={t.tier} value={t.tier}>
                  Tier {t.tier} — {t.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card">
          <div className="field">
            <label htmlFor="trainingDays">Training days target</label>
            <input
              id="trainingDays"
              type="number"
              min={0}
              max={7}
              value={trainingDaysTarget}
              onChange={(e) => setTrainingDaysTarget(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="protein">Protein target (g/kg bodyweight)</label>
            <input
              id="protein"
              type="number"
              step={0.1}
              min={0}
              value={proteinTargetGPerKg}
              onChange={(e) => setProteinTargetGPerKg(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="sleep">Sleep target (hours)</label>
            <input
              id="sleep"
              type="number"
              step={0.5}
              min={0}
              max={14}
              value={sleepTargetHours}
              onChange={(e) => setSleepTargetHours(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={deload}
                onChange={(e) => setDeload(e.target.checked)}
                style={{ width: "auto", marginRight: 8 }}
              />
              Deload week
            </label>
          </div>
        </section>

        <section className="card">
          <div className="field">
            <label htmlFor="focus">Focus</label>
            <input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. return to load, phase 2"
            />
          </div>
          <div className="field">
            <label htmlFor="rationale">Rationale (shown to you in plain language)</label>
            <textarea
              id="rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why this plan, this week?"
            />
          </div>
        </section>

        <button type="submit" className="btn btn-primary">
          Save weekly block
        </button>
      </form>
    </div>
  );
}
