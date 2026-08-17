"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Leaderboard" },
  { href: "/submit", label: "Submit" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-[--color-border] bg-[--color-bg]/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-1 px-3 py-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                active
                  ? "bg-[--color-surface-2] text-[--color-text]"
                  : "text-[--color-muted] hover:text-[--color-text]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
