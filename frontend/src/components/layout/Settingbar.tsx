"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LanguageToggle from "../ui/LanguageToggle";
import ThemeToggle from "../ui/ThemeToggle";
import { Settings, LogOut, ChevronDown, UserCog } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SettingBar() {
  const t = useTranslations("Settings");
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="fixed top-4 right-6 z-50">
      <div className="relative flex flex-col items-end">
        <button

          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 p-1.5 pr-3 hover:cursor-pointer rounded-full border transition-all duration-300 shadow-sm z-30 relative
            ${isOpen
              ? "bg-sol-surface border-sol-accent shadow-lg ring-4 ring-sol-accent/5"
              : "bg-sol-surface border-sol-border/30 hover:border-sol-accent"
            }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300
            ${isOpen
                ? "bg-sol-accent text-sol-bg"
                : "bg-sol-accent/10 text-sol-accent"
              }`}
          >
            <UserCog size={18} />
          </div>

          <span
            className={`text-sm font-medium transition-colors ${isOpen ? "text-sol-text" : "text-sol-muted"
              }`}
          >
            {user?.email?.split("@")[0]}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-sol-accent" : "text-sol-muted"
              }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute top-0 right-0 w-72 bg-sol-surface border border-sol-accent/20 rounded-2xl shadow-2xl z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

              <div className="p-3 pt-0 flex flex-col gap-1">
                <div className="space-y-3 px-1 py-2">
                  <div className="flex flex-col gap-1">
                    <LanguageToggle />
                  </div>

                  <div className="flex items-center justify-between px-3 py-1 bg-sol-bg/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-sol-text" >
                      <span className="opacity-70">{t("appearance")}</span>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                <div className="h-px bg-sol-border/10 my-1 mx-2" />

                <div className="space-y-1">
                  <Link
                    prefetch={false}
                    href="/student/settings"
                    className="flex items-center gap-3 px-3 py-3 text-sm text-sol-text hover:bg-sol-bg rounded-xl transition-all group/item"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings
                      size={18}
                      className="text-sol-muted group-hover/item:text-sol-accent transition-colors"
                    />
                    <span className="flex-1">{t("accountSettings")}</span>
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-sol-orange font-bold hover:cursor-pointer hover:bg-sol-orange/10 rounded-xl transition-all text-left group/logout"
                  >
                    <LogOut
                      size={18}
                      className="transition-transform group-hover/logout:translate-x-1"
                    />
                    <span>{t("signOut")}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}