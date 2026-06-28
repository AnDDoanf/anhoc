"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Gamepad2,
  ShoppingBag,
  Zap,
  Trophy,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const items = [
    { href: "/student", label: t("dashboard"), icon: <LayoutDashboard size={28} /> },
    { href: "/student/learning", label: t("learning"), icon: <BookOpen size={28} /> },
    { href: "/student/games", label: t("games"), icon: <Gamepad2 size={28} /> },
    { href: "/student/shop", label: t("shop"), icon: <ShoppingBag size={28} /> },
    { href: "/student/upgrade", label: t("upgrade"), icon: <Zap size={28} /> },
    { href: "/student/achievements", label: t("achievements"), icon: <Trophy size={28} /> },
  ];

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 w-full max-w-full overflow-hidden animate-in slide-in-from-bottom duration-500 ease-out border-t-2">
      <div className="grid grid-cols-6 items-center overflow-hidden bg-sol-surface/85 backdrop-blur-md px-2 py-3 rounded-t-2xl">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/student" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl px-1 py-2 transition-colors duration-300 group
                ${isActive ? "text-sol-accent font-semibold" : "text-sol-muted hover:text-sol-accent"}
              `}
            >
              <span className={`transition-transform duration-300 group-hover:-translate-y-0.5 ${isActive ? "text-sol-accent" : "text-sol-muted"}`}>
                {item.icon}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-6 h-0.5 bg-sol-accent rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
