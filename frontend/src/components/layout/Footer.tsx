"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import ThemeToggle from "../ui/ThemeToggle";

export default function Footer() {
  return (
    <footer className="w-full py-6 border-t border-sol-border/20 bg-sol-bg mt-auto">
      <div className="max-w-[440px] mx-auto px-4 flex justify-between items-center text-sm text-sol-muted">
        <p>© 2026 Your App</p>
        

      </div>
    </footer>
  );
}