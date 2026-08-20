"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLeaderboard,
  getMyEntries,
  getToday,
  type LeaderRow,
  type Period,
  type StepEntry,
} from "@/lib/api";
import { currentStreak } from "@/lib/streaks";
import { clearName, getName, getToken, setName } from "@/lib/token";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All-time" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

/** Local ISO date (YYYY-MM-DD) for a Date, matching how entries are stored. */
function toIso(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

/** Inclusive start bound for a period, computed the same way the backend does
 *  (Monday-start week, 1st-of-month) so a client sum lines up with a row. */
function periodStart(todayIso: string, period: Period): string | null {
  if (period === "all") return null;
  if (period === "day") return todayIso;
  const d = new Date(`${todayIso}T00:00:00`);
  if (period === "week") {
    const mondayOffset = (d.getDay() + 6) % 7; // getDay: 0=Sun → 6; Mon → 0
    d.setDate(d.getDate() - mondayOffset);
  } else if (period === "month") {
    d.setDate(1);
  }
  return toIso(d);
}

function sumInRange(entries: StepEntry[], start: string | null, end: string): number {
  return entries
    .filter((e) => (start === null || e.date >= start) && e.date <= end)
    .reduce((acc, e) => acc + e.steps, 0);
}

/** The caller's last 7 days ending today, oldest-first, missing days as 0. */
function last7(entries: StepEntry[], todayIso: string): { date: string; steps: number }[] {
  const byDate = new Map(entries.map((e) => [e.date, e.steps]));
  const end = new Date(`${todayIso}T00:00:00`);
  const out: { date: string; steps: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = toIso(d);
    out.push({ date: iso, steps: byDate.get(iso) ?? 0 });
  }
  return out;
}

function Sparkline({ values }: { values: number[] }) {
  const w = 132;
  const h = 34;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - 3 - (v / max) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastX = (values.length - 1) * step;
  const lastY = h - 3 - (values[values.length - 1] / max) * (h - 6);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.4" fill="var(--color-accent)" />
    </svg>
  );
}

/** One row + relative progress bar. Rank 1 and "you" get a brighter surface. */
function LeaderItem({
  row,
  topSteps,
  isMe,
  canPin,
  onPin,
}: {
  row: LeaderRow;
  topSteps: number;
  isMe: boolean;
  canPin: boolean;
  onPin: () => void;
}) {
  const medal = row.rank <= 3 ? MEDAL[row.rank - 1] : null;
  const pct = topSteps > 0 ? Math.max(3, Math.round((row.steps / topSteps) * 100)) : 0;

  const base =
    "group relative rounded-2xl border p-4 transition-all duration-200";
  const surface = isMe
    ? "border-(--color-accent-border) bg-(--color-accent-weak) glow-sm"
    : row.rank === 1
      ? "border-(--color-border-strong) bg-(--color-surface-2) glow-sm"
      : "border-(--color-border) bg-(--color-surface) hover:-translate-y-0.5 hover:border-(--color-border-strong) hover:bg-(--color-surface-2)";
  const hot = row.rank === 1 || isMe;

  return (
    <li className={`${base} ${surface}`}>
      <div className="flex items-center gap-3">
        <span
          className={`w-9 shrink-0 text-center text-xl font-extrabold tabular-nums ${
            medal ? "" : "text-(--color-muted)"
          }`}
        >
          {medal ?? row.rank}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-[17px] font-bold">{row.name}</span>
          {isMe && (
            <span className="accent-grad glow-sm shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-(--color-on-accent)">
              You
            </span>
          )}
        </span>

        {canPin && !isMe && (
          <button
            onClick={onPin}
            className="shrink-0 rounded-md border border-(--color-border) px-2 py-1 text-[11px] font-semibold text-(--color-muted) opacity-0 transition group-hover:opacity-100 hover:border-(--color-border-strong) hover:text-(--color-text)"
          >
            This is me
          </button>
        )}

        <span
          className={`shrink-0 text-[22px] font-extrabold tabular-nums ${
            hot ? "text-grad" : ""
          }`}
        >
          {row.steps.toLocaleString()}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            hot ? "accent-grad glow-sm" : "bg-(--color-accent-soft)"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Identity context — only present when a token is stored on this device.
  const [today, setToday] = useState<string | null>(null);
  const [entries, setEntries] = useState<StepEntry[] | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  // Load the caller's own context once (name pin, recent history, canonical date).
  useEffect(() => {
    const token = getToken();
    setHasToken(Boolean(token));
    setMyName(getName());
    getToday()
      .then((t) => setToday(t.date))
      .catch(() => setToday(toIso(new Date())));
    if (token) {
      getMyEntries(35)
        .then(setEntries)
        .catch(() => setEntries([]));
    }
  }, []);

  // Refetch the board whenever the period changes.
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

  // Resolve which row is "me": prefer a pinned name; otherwise, for a bounded
  // period, match the caller's exact period total to a single row and pin it.
  useEffect(() => {
    if (!rows || !today) return;
    if (myName && rows.some((r) => r.name === myName)) return;
    if (!entries || period === "all") return;
    const mine = sumInRange(entries, periodStart(today, period), today);
    if (mine <= 0) return;
    const matches = rows.filter((r) => r.steps === mine);
    if (matches.length === 1) {
      setName(matches[0].name);
      setMyName(matches[0].name);
    }
  }, [rows, entries, today, period, myName]);

  const topSteps = rows?.[0]?.steps ?? 0;
  const myRow = myName ? rows?.find((r) => r.name === myName) ?? null : null;

  const stats = useMemo(() => {
    if (!entries || !today) return null;
    const week = last7(entries, today);
    const logged = week.filter((d) => d.steps > 0);
    const avg = logged.length
      ? Math.round(logged.reduce((a, d) => a + d.steps, 0) / logged.length)
      : 0;
    return {
      values: week.map((d) => d.steps),
      avg,
      streak: currentStreak(entries),
    };
  }, [entries, today]);

  function pin(name: string) {
    setName(name);
    setMyName(name);
  }
  function unpin() {
    clearName();
    setMyName(null);
  }

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <div>
      <header className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-(--color-muted)">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full accent-grad" />
          Live standings
        </div>
        <h1 className="text-grad text-[44px] font-extrabold leading-[0.95] tracking-tight sm:text-[60px]">
          LEADERBOARD
        </h1>
        <p className="mt-2 text-sm font-medium text-(--color-muted)">
          Steps ranked across the group · {periodLabel.toLowerCase()}
        </p>
      </header>

      {/* Segmented control — the active option is a loud gradient pill. */}
      <div
        role="tablist"
        aria-label="Leaderboard period"
        className="mb-6 grid grid-cols-4 gap-1 rounded-2xl border border-(--color-border) bg-(--color-surface) p-1.5"
      >
        {PERIODS.map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(p.key)}
              className={`rounded-xl py-2.5 text-sm font-extrabold uppercase tracking-wide transition-all duration-200 ${
                active
                  ? "accent-grad glow-sm scale-[1.03] text-(--color-on-accent)"
                  : "text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-text)"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Your Position — real rank/steps from the board, own stats from /me. */}
      {myRow && (
        <section className="glow relative mb-6 overflow-hidden rounded-2xl border border-(--color-accent-border) bg-(--color-accent-weak) p-5">
          {/* faint gradient wash to make the hero card feel "lit" */}
          <div className="accent-grad pointer-events-none absolute inset-0 opacity-[0.10]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-grad text-[12px] font-extrabold uppercase tracking-[0.2em]">
                Your position
              </span>
              <button
                onClick={unpin}
                className="text-[11px] text-(--color-muted) underline underline-offset-2 hover:text-(--color-text)"
              >
                Not you?
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tabular-nums">#{myRow.rank}</span>
                  <span className="truncate text-[17px] font-bold">{myRow.name}</span>
                </div>
                {stats && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    <span className="rounded-full border border-(--color-border) bg-(--color-surface) px-2 py-0.5">
                      🔥 {stats.streak} day streak
                    </span>
                    <span className="rounded-full border border-(--color-border) bg-(--color-surface) px-2 py-0.5">
                      7-day avg {stats.avg.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-grad text-[40px] font-extrabold leading-none tabular-nums">
                  {myRow.steps.toLocaleString()}
                </div>
                <div className="mt-1 text-xs font-medium text-(--color-muted)">
                  steps · {periodLabel.toLowerCase()}
                </div>
              </div>
            </div>

            {stats && (
              <div className="mt-4 border-t border-(--color-border) pt-3">
                <Sparkline values={stats.values} />
                <div className="mt-1 text-[11px] text-(--color-muted)">last 7 days</div>
              </div>
            )}
          </div>
        </section>
      )}

      {hasToken && !myRow && rows && rows.length > 0 && (
        <p className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 text-sm text-(--color-muted)">
          Tap <span className="text-(--color-text)">“This is me”</span> on your row to pin your position.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Couldn’t load leaderboard: {error}
        </p>
      )}

      {!rows && !error && <p className="text-sm text-(--color-muted)">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="text-sm text-(--color-muted)">No steps logged for this period yet.</p>
      )}

      <ol className="space-y-2.5">
        {rows?.map((row) => (
          <LeaderItem
            key={row.name}
            row={row}
            topSteps={topSteps}
            isMe={myName === row.name}
            canPin={hasToken}
            onPin={() => pin(row.name)}
          />
        ))}
      </ol>
    </div>
  );
}
