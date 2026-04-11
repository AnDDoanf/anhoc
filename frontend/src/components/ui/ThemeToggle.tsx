"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // The head script in layout.tsx already applied the class 'dark' if needed.
    // We just need to sync our component state with the actual DOM state.
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    
    // Ensure localStorage is populated if it was empty (e.g., first visit using system pref)
    if (!localStorage.getItem("theme")) {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (dark !== null) {
      document.documentElement.classList.toggle("dark", dark);
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