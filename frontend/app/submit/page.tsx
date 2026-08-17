"use client";

import { useState } from "react";
import { submitSteps, type StepEntry } from "@/lib/api";
import { DAILY_GOAL, hitGoal } from "@/lib/streaks";
import TokenGate from "@/components/TokenGate";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

function SubmitForm() {
  const [date, setDate] = useState(todayIso());
  const [steps, setSteps] = useState("");
  const [saved, setSaved] = useState<StepEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    const n = Number(steps);
    if (!Number.isInteger(n) || n < 0 || n > 200000) {
      setError("Steps must be a whole number between 0 and 200,000.");
      return;
    }
    setBusy(true);
    try {
      const entry = await submitSteps({ date, steps: n, source: "manual" });
      setSaved(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Submit steps</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-[--color-muted]">Date</span>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[--color-border] bg-[--color-surface-2] px-3 py-2 outline-none focus:border-[--color-accent]"
          />
        </label>

        <label className="block">
          <span className="text-sm text-[--color-muted]">Steps</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={200000}
            placeholder="e.g. 8432"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-lg tabular-nums outline-none focus:border-[--color-accent]"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[--color-accent] py-3 font-semibold text-[#04222f] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save steps"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {saved && (
        <div className="mt-3 rounded-lg border border-[--color-border] bg-[--color-surface] p-3 text-sm">
          Saved <strong>{saved.steps.toLocaleString()}</strong> steps for {saved.date}.
          {hitGoal(saved.steps) ? (
            <span className="ml-1 text-[--color-gold]">🎯 Goal hit!</span>
          ) : (
            <span className="ml-1 text-[--color-muted]">
              {(DAILY_GOAL - saved.steps).toLocaleString()} to go for your {DAILY_GOAL.toLocaleString()} goal.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmitPage() {
  return (
    <TokenGate>
      <SubmitForm />
    </TokenGate>
  );
}
