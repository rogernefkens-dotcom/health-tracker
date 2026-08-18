"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Vandaag", icon: "🏠" },
  { href: "/eten", label: "Eten", icon: "🍽️" },
  { href: "/coach", label: "Coach", icon: "💬" },
  { href: "/training", label: "Training", icon: "🏋️" },
  { href: "/settings", label: "Meer", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 z-50">
      <div className="max-w-md mx-auto grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] ${
                active ? "text-lime-400" : "text-neutral-500"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
