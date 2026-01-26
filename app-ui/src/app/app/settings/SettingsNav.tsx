"use client";

import Link from "next/link";

type NavItem = "profile" | "pricing" | "rules";

const navItems: { key: NavItem; label: string; href: string }[] = [
  { key: "profile", label: "Profile", href: "/app/settings" },
  { key: "pricing", label: "Pricing & Booking", href: "/app/settings/pricing" },
  { key: "rules", label: "Rules", href: "/app/settings/rules" },
];

export default function SettingsNav({ active }: { active: NavItem }) {
  return (
    <div className="flex gap-2 mb-6">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            active === item.key
              ? "bg-coral text-white"
              : "bg-white text-cb-text-secondary border border-cb-border hover:border-coral hover:text-coral"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
