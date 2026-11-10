"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Clearance, Condition, UserContract } from "@/types/schema";
import { getUserContract, saveUserContract, getBaselineDiet, saveBaselineDiet } from "@/lib/storage";
import StringListEditor from "@/components/StringListEditor";

function emptyCondition(): Condition {
  return { name: "", severity: undefined };
}

function emptyClearance(): Clearance {
  return { activityType: "", cleared: false };
}

export default function IntakePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [activeRedFlags, setActiveRedFlags] = useState<string[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [painScoreAtIntake, setPainScoreAtIntake] = useState(0);

  const [primaryGoalText, setPrimaryGoalText] = useState("");
  const [primaryGoalTargetDate, setPrimaryGoalTargetDate] = useState("");
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([]);
  const [definitionOfSuccess, setDefinitionOfSuccess] = useState("");

  const [typicalBreakfast, setTypicalBreakfast] = useState("");
  const [typicalMainMeals, setTypicalMainMeals] = useState("");
  const [typicalSnacks, setTypicalSnacks] = useState("");

  useEffect(() => {
    const existing = getUserContract();
    if (existing) {
      setExistingId(existing.id);
      setCreatedAt(existing.createdAt);
      setLastUpdated(existing.updatedAt);
      setConditions(existing.medical.diagnosedConditions);
      setActiveRedFlags(existing.medical.activeRedFlags);
      setClearances(existing.medical.currentClearances);
      setMedications(existing.medical.medications);
      setSymptomDescription(existing.medical.symptomBaseline.description);
      setPainScoreAtIntake(existing.medical.symptomBaseline.painScoreAtIntake);
      setPrimaryGoalText(existing.goals.primary.text);
      setPrimaryGoalTargetDate(existing.goals.primary.targetDate ?? "");
      setSecondaryGoals(existing.goals.secondary.map((g) => g.text));
      setDefinitionOfSuccess(existing.goals.definitionOfSuccess);
    }
    const existingDiet = getBaselineDiet();
    if (existingDiet) {
      setTypicalBreakfast(existingDiet.typicalBreakfast);
      setTypicalMainMeals(existingDiet.typicalMainMeals);
      setTypicalSnacks(existingDiet.typicalSnacksAndBetweenMeals);
    }
    setLoaded(true);
  }, []);

  function updateCondition(index: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateClearance(index: number, patch: Partial<Clearance>) {
    setClearances((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const contract: UserContract = {
      id: existingId ?? crypto.randomUUID(),
      createdAt: createdAt ?? now,
      updatedAt: now,
      medical: {
        diagnosedConditions: conditions.filter((c) => c.name.trim().length > 0),
        activeRedFlags,
        currentClearances: clearances.filter((c) => c.activityType.trim().length > 0),
        medications,
        symptomBaseline: {
          description: symptomDescription,
          painScoreAtIntake,
        },
      },
      goals: {
        primary: {
          text: primaryGoalText,
          targetDate: primaryGoalTargetDate || undefined,
        },
        secondary: secondaryGoals.map((text) => ({ text })),
        definitionOfSuccess,
      },
    };
    saveUserContract(contract);
    if (typicalBreakfast || typicalMainMeals || typicalSnacks) {
      saveBaselineDiet({
        typicalBreakfast,
        typicalMainMeals,
        typicalSnacksAndBetweenMeals: typicalSnacks,
        parsedAt: now,
      });
    }
    router.push("/weekly-block");
  }

  if (!loaded) return null;

  return (
    <div>
      <h1>Intake</h1>
      <p className="subtitle">
        Medical and safety, plus your goals. Captured once — you only revisit this if
        something actually changes.
        {lastUpdated && (
          <>
            {" "}
            Last updated {new Date(lastUpdated).toLocaleDateString()}.
          </>
        )}
      </p>

      <form onSubmit={handleSubmit} className="stack">
        <section className="card">
          <h2>Diagnosed conditions</h2>
          {conditions.map((c, i) => (
            <div key={i} className="condition-row">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Name</label>
                <input
                  value={c.name}
                  onChange={(e) => updateCondition(i, { name: e.target.value })}
                  placeholder="e.g. lumbar disc herniation"
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Severity</label>
                <select
                  value={c.severity ?? ""}
                  onChange={(e) =>
                    updateCondition(i, {
                      severity: (e.target.value || undefined) as Condition["severity"],
                    })
                  }
                >
                  <option value="">Unspecified</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() => setConditions((prev) => [...prev, emptyCondition()])}
          >
            Add condition
          </button>
        </section>

        <section className="card">
          <StringListEditor
            label="Active red flags"
            hint="Free text — anything currently active that a clinician should know about."
            placeholder="e.g. numbness in left foot"
            items={activeRedFlags}
            onChange={setActiveRedFlags}
          />
        </section>

        <section className="card">
          <h2>Clearances</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            Only a professional can clear an activity — this gate can&apos;t be
            self-set or inferred by the app.
          </p>
          {clearances.map((c, i) => (
            <div key={i} className="condition-row" style={{ gridTemplateColumns: "1fr" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Activity type</label>
                <input
                  value={c.activityType}
                  onChange={(e) => updateClearance(i, { activityType: e.target.value })}
                  placeholder="e.g. running, contact sport, heavy lifting"
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={c.cleared}
                    onChange={(e) => updateClearance(i, { cleared: e.target.checked })}
                    style={{ width: "auto", marginRight: 8 }}
                  />
                  Cleared
                </label>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Cleared by (professional identifier)</label>
                <input
                  value={c.clearedBy ?? ""}
                  onChange={(e) => updateClearance(i, { clearedBy: e.target.value })}
                  placeholder="e.g. Dr. A. Rao, physiotherapist"
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Review by</label>
                <input
                  type="date"
                  value={c.reviewBy ?? ""}
                  onChange={(e) => updateClearance(i, { reviewBy: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => setClearances((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() => setClearances((prev) => [...prev, emptyClearance()])}
          >
            Add clearance
          </button>
        </section>

        <section className="card">
          <StringListEditor
            label="Current medications"
            items={medications}
            onChange={setMedications}
            placeholder="e.g. ibuprofen as needed"
          />
        </section>

        <section className="card">
          <h2>Symptom baseline</h2>
          <div className="field">
            <label>Description</label>
            <textarea
              value={symptomDescription}
              onChange={(e) => setSymptomDescription(e.target.value)}
              placeholder="What does it feel like right now, in your own words?"
            />
          </div>
          <div className="field">
            <label>Pain score at intake ({painScoreAtIntake}/10)</label>
            <input
              type="range"
              min={0}
              max={10}
              value={painScoreAtIntake}
              onChange={(e) => setPainScoreAtIntake(Number(e.target.value))}
            />
          </div>
        </section>

        <section className="card">
          <h2>Goals</h2>
          <div className="field">
            <label>Primary goal</label>
            <input
              value={primaryGoalText}
              onChange={(e) => setPrimaryGoalText(e.target.value)}
              placeholder="e.g. play football again without pain"
              required
            />
          </div>
          <div className="field">
            <label>Target date (optional)</label>
            <input
              type="date"
              value={primaryGoalTargetDate}
              onChange={(e) => setPrimaryGoalTargetDate(e.target.value)}
            />
          </div>
          <StringListEditor
            label="Secondary goals"
            items={secondaryGoals}
            onChange={setSecondaryGoals}
            placeholder="e.g. sleep 7+ hours consistently"
          />
          <div className="field">
            <label>What does success look like, in your own words?</label>
            <textarea
              value={definitionOfSuccess}
              onChange={(e) => setDefinitionOfSuccess(e.target.value)}
            />
          </div>
        </section>

        <section className="card">
          <h2>Baseline diet</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            A one-time snapshot — used to make meal suggestions realistic from day one.
            Not tracked daily.
          </p>
          <div className="field">
            <label>Typical breakfast</label>
            <textarea
              value={typicalBreakfast}
              onChange={(e) => setTypicalBreakfast(e.target.value)}
              placeholder="e.g. 2 rotis with dal, or poha, or oats"
            />
          </div>
          <div className="field">
            <label>Typical lunch and dinner</label>
            <textarea
              value={typicalMainMeals}
              onChange={(e) => setTypicalMainMeals(e.target.value)}
              placeholder="e.g. rice, dal, sabzi, sometimes chicken"
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Snacks and between meals</label>
            <textarea
              value={typicalSnacks}
              onChange={(e) => setTypicalSnacks(e.target.value)}
              placeholder="e.g. chai, fruit, biscuits, protein shake"
            />
          </div>
        </section>

        <button type="submit" className="btn btn-primary">
          Save intake
        </button>
      </form>
    </div>
  );
}
