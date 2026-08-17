"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, type LeaderRow, type Period } from "@/lib/api";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All-time" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    getLeaderboard(period)
      .then((data) => alive && setRows(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [period]);

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Leaderboard</h1>

      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-[--color-surface] p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-[--color-accent] text-[#04222f]"
                : "text-[--color-muted] hover:text-[--color-text]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Couldn’t load leaderboard: {error}
        </p>
      )}

      {!rows && !error && <p className="text-sm text-[--color-muted]">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="text-sm text-[--color-muted]">No steps logged for this period yet.</p>
      )}

      <ol className="space-y-2">
        {rows?.map((row) => {
          const medal = row.rank <= 3 ? MEDAL[row.rank - 1] : null;
          return (
            <li
              key={row.name}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                medal
                  ? "border-[--color-border] bg-[--color-surface-2]"
                  : "border-[--color-border] bg-[--color-surface]"
              }`}
            >
              <span className="w-7 text-center text-lg font-bold text-[--color-muted]">
                {medal ?? row.rank}
              </span>
              <span className="flex-1 font-medium">{row.name}</span>
              <span className="tabular-nums font-semibold">
                {row.steps.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
