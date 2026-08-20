"use client";

import { useEffect, useState } from "react";
import { getMyEntries, type StepEntry } from "@/lib/api";
import { currentStreak, DAILY_GOAL, hitGoal } from "@/lib/streaks";
import TokenGate from "@/components/TokenGate";

function History() {
  const [entries, setEntries] = useState<StepEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyEntries(30)
      .then((data) => alive && setEntries(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const streak = entries ? currentStreak(entries) : 0;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-3 text-xl font-bold">My history</h1>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
          <div className="text-2xl font-bold tabular-nums">🔥 {streak}</div>
          <div className="text-xs text-(--color-muted)">
            day streak (≥ {DAILY_GOAL.toLocaleString()})
          </div>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
          <div className="text-2xl font-bold tabular-nums">{entries?.length ?? 0}</div>
          <div className="text-xs text-(--color-muted)">days logged (last 30)</div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Couldn’t load history: {error}
        </p>
      )}

      {!entries && !error && <p className="text-sm text-(--color-muted)">Loading…</p>}

      {entries && entries.length === 0 && (
        <p className="text-sm text-(--color-muted)">
          No entries yet — log your first day on the Submit tab.
        </p>
      )}

      <ul className="space-y-2">
        {entries?.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-3"
          >
            <span className="flex-1 font-medium tabular-nums">{e.date}</span>
            {hitGoal(e.steps) && <span title="Goal hit" className="text-(--color-gold)">🎯</span>}
            <span className="tabular-nums font-semibold">{e.steps.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <TokenGate>
      <History />
    </TokenGate>
  );
}
