"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyCheckIn } from "@/types/schema";
import { getCheckInForDate, getUserContract, saveCheckIn } from "@/lib/storage";
import { todayISO } from "@/lib/date";

const SYMPTOM_LABELS = ["None", "Mild", "Moderate", "Significant", "Severe"];
const PAIN_SCALE = Array.from({ length: 11 }, (_, i) => i);
const TREND_OPTIONS: { value: DailyCheckIn["trendVsYesterday"]; label: string }[] = [
  { value: "better", label: "Better" },
  { value: "same", label: "Same" },
  { value: "worse", label: "Worse" },
];

export default function CheckInPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [hasContract, setHasContract] = useState(true);

  const [symptomExtent, setSymptomExtent] = useState<number | null>(null);
  const [painScore, setPainScore] = useState<number | null>(null);
  const [trendVsYesterday, setTrendVsYesterday] =
    useState<DailyCheckIn["trendVsYesterday"] | null>(null);
  const [redFlagTriggered, setRedFlagTriggered] = useState<boolean | null>(null);
  const [redFlagDetail, setRedFlagDetail] = useState("");

  const date = todayISO();

  useEffect(() => {
    setHasContract(!!getUserContract());
    const existing = getCheckInForDate(date);
    if (existing) {
      setSymptomExtent(existing.symptomExtent);
      setPainScore(existing.painScore);
      setTrendVsYesterday(existing.trendVsYesterday);
      setRedFlagTriggered(existing.redFlagTriggered);
      setRedFlagDetail(existing.redFlagDetail ?? "");
    }
    setLoaded(true);
  }, [date]);

  const complete =
    symptomExtent !== null &&
    painScore !== null &&
    trendVsYesterday !== null &&
    redFlagTriggered !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    const checkIn: DailyCheckIn = {
      date,
      symptomExtent: symptomExtent!,
      painScore: painScore!,
      trendVsYesterday: trendVsYesterday!,
      redFlagTriggered: redFlagTriggered!,
      redFlagDetail: redFlagTriggered ? redFlagDetail || undefined : undefined,
    };
    saveCheckIn(checkIn);
    router.push("/today");
  }

  if (!loaded) return null;

  if (!hasContract) {
    return (
      <div className="empty-state">
        <p>Complete intake first — check-in needs your medical baseline.</p>
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
      <h1>Daily check-in</h1>
      <p className="subtitle">Four taps, under 20 seconds. {date}</p>

      <form onSubmit={handleSubmit} className="stack">
        <section className="card">
          <h2>Symptom extent</h2>
          <div className="tap-grid">
            {SYMPTOM_LABELS.map((label, value) => (
              <button
                key={value}
                type="button"
                className="tap-option"
                aria-pressed={symptomExtent === value}
                onClick={() => setSymptomExtent(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Pain score (0–10)</h2>
          <div className="tap-grid">
            {PAIN_SCALE.map((value) => (
              <button
                key={value}
                type="button"
                className="tap-option"
                aria-pressed={painScore === value}
                onClick={() => setPainScore(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Trend vs yesterday</h2>
          <div className="tap-grid">
            {TREND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="tap-option"
                aria-pressed={trendVsYesterday === opt.value}
                onClick={() => setTrendVsYesterday(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Any red flag today?</h2>
          <div className="tap-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button
              type="button"
              className="tap-option"
              aria-pressed={redFlagTriggered === true}
              onClick={() => setRedFlagTriggered(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className="tap-option"
              aria-pressed={redFlagTriggered === false}
              onClick={() => {
                setRedFlagTriggered(false);
                setRedFlagDetail("");
              }}
            >
              No
            </button>
          </div>
          {redFlagTriggered && (
            <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
              <label htmlFor="redFlagDetail">What happened? (optional, quick note)</label>
              <textarea
                id="redFlagDetail"
                value={redFlagDetail}
                onChange={(e) => setRedFlagDetail(e.target.value)}
              />
            </div>
          )}
        </section>

        <button type="submit" className="btn btn-primary" disabled={!complete}>
          Submit check-in
        </button>
      </form>
    </div>
  );
}
