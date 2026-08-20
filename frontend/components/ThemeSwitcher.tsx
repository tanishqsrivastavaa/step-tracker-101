"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, THEMES, type ThemeId } from "@/lib/theme";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId | null>(null);

  // Sync to whatever the pre-hydration script already set (avoids a flash).
  useEffect(() => setTheme(getTheme()), []);

  function pick(id: ThemeId) {
    applyTheme(id);
    setTheme(id);
  }

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={t.label}
            onClick={() => pick(t.id)}
            className={`h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110 ${
              active ? "scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-(--color-bg)" : "opacity-70 hover:opacity-100"
            }`}
            style={{
              backgroundImage: `linear-gradient(120deg, ${t.swatch}, ${t.swatch2})`,
              boxShadow: active ? `0 0 12px -2px ${t.swatch}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
