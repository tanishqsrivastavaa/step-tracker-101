// Dead-simple auth for a friend group: the user pastes their token once and we
// keep it in localStorage, sending it as the bearer token on requests.
//
// TODO: replace with Supabase Auth (real accounts / magic links) as a future
// upgrade once this grows beyond a handful of trusted friends.

const KEY = "steps.token";
const NAME_KEY = "steps.name";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(KEY, token.trim());
}

export function clearToken(): void {
  window.localStorage.removeItem(KEY);
}

// Which leaderboard row is "me". Resolved automatically by matching the caller's
// period total (from /me) to a row, or pinned by hand — then remembered here so
// the "Your Position" card is instant and unambiguous on later visits.
export function getName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setName(name: string): void {
  window.localStorage.setItem(NAME_KEY, name);
}

export function clearName(): void {
  window.localStorage.removeItem(NAME_KEY);
}
