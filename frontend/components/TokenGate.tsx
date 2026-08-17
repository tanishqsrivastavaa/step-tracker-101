"use client";

// Wraps any view that needs the user's token. If no token is stored, it shows a
// one-time paste box instead of the children. Once saved, the token lives in
// localStorage and is reused on every request.

import { useEffect, useState } from "react";
import { clearToken, getToken, setToken } from "@/lib/token";

export default function TokenGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    setHasToken(Boolean(getToken()));
    setReady(true);
  }, []);

  if (!ready) return null; // avoid a hydration flash before localStorage is read

  if (!hasToken) {
    return (
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4">
        <h2 className="text-base font-semibold">Enter your token</h2>
        <p className="mt-1 text-sm text-[--color-muted]">
          A friend running this got you a token. Paste it once — it stays on this device.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            setToken(value);
            setHasToken(true);
          }}
        >
          <input
            type="password"
            autoComplete="off"
            placeholder="paste token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-lg border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm outline-none focus:border-[--color-accent]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-semibold text-[#04222f]"
          >
            Save
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {children}
      <button
        onClick={() => {
          clearToken();
          setHasToken(false);
        }}
        className="mt-6 text-xs text-[--color-muted] underline underline-offset-2"
      >
        Forget token on this device
      </button>
    </div>
  );
}
