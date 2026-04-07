"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if the dark class is already on the document on mount
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  useEffect(() => {
    // Only apply changes if dark is not null (prevents the initial "flash")
    if (dark !== null) {
      document.documentElement.classList.toggle("dark", dark);
      // Optional: Save preference to localStorage
      localStorage.setItem("theme", dark ? "dark" : "light");
    }
  }, [dark]);

  // Prevent rendering the toggle until we know the theme to avoid "jumping"
  if (dark === null) return <div className="w-14 h-8" />;

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDark(!dark);
      }}
      className="w-14 h-8 flex items-center hover:cursor-pointer bg-sol-bg border border-sol-border/30 rounded-full p-1 transition-colors relative"
    >
      <div
        className={`w-6 h-6 bg-sol-accent rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
          dark ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}