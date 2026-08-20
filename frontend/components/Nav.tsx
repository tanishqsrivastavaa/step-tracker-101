"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const TABS = [
  { href: "/", label: "Leaderboard" },
  { href: "/submit", label: "Submit" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-bg)/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 py-2.5 sm:px-6">
        <Link href="/" className="mr-2 shrink-0 text-base font-extrabold tracking-tight">
          <span className="text-grad">STEP</span>
          <span className="text-(--color-text)">TRACK</span>
        </Link>

        <div className="flex flex-1 items-center gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-(--color-accent-weak) text-(--color-accent)"
                    : "text-(--color-muted) hover:text-(--color-text)"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <ThemeSwitcher />
      </div>
    </nav>
  );
}
