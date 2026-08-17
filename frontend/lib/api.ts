// Thin typed client around the backend. All step data flows through these calls;
// the browser never touches HealthKit / Health Connect (those have no web API).

import { getToken } from "./token";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://step-tracker-101.onrender.com";

export type Period = "day" | "week" | "month" | "all";

export interface LeaderRow {
  rank: number;
  name: string;
  steps: number;
}

export interface StepEntry {
  id: number;
  date: string; // YYYY-MM-DD
  steps: number;
  source: string;
  updated_at: string;
}

export type StepSource = "manual" | "shortcut" | "android" | "app";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    // Surface the backend's detail message where possible so forms can show it.
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body — keep the status line */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getLeaderboard(period: Period): Promise<LeaderRow[]> {
  return request<LeaderRow[]>(`/leaderboard?period=${period}`);
}

export function getMyEntries(days = 30): Promise<StepEntry[]> {
  return request<StepEntry[]>(`/me?days=${days}`, { headers: authHeaders() });
}

export function submitSteps(input: {
  date: string;
  steps: number;
  source?: StepSource;
}): Promise<StepEntry> {
  return request<StepEntry>(`/steps`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ source: "manual", ...input }),
  });
}
