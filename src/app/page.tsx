"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCheckInForDate, getLatestWeeklyBlock, getUserContract } from "@/lib/storage";
import { todayISO } from "@/lib/date";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const contract = getUserContract();
    if (!contract) {
      router.replace("/intake");
      return;
    }
    const weeklyBlock = getLatestWeeklyBlock();
    if (!weeklyBlock) {
      router.replace("/weekly-block");
      return;
    }
    const checkIn = getCheckInForDate(todayISO());
    if (!checkIn) {
      router.replace("/checkin");
      return;
    }
    router.replace("/today");
    setReady(true);
  }, [router]);

  if (ready) return null;

  return (
    <div className="empty-state">
      <p>Loading Health Agent…</p>
    </div>
  );
}
