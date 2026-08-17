// Dead-simple auth for a friend group: the user pastes their token once and we
// keep it in localStorage, sending it as the bearer token on requests.
//
// TODO: replace with Supabase Auth (real accounts / magic links) as a future
// upgrade once this grows beyond a handful of trusted friends.

const KEY = "steps.token";

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
