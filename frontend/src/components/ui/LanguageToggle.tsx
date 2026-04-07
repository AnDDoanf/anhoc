"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  const handleLanguageChange = (newLocale: string) => {
    // 1. Set the cookie so the server knows which language to load next time
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // 2. Refresh the page to reload the dictionary from getMessages()
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4 px-3 py-2 text-sm">
      <button
        onClick={() => handleLanguageChange("en")}
        className={`transition-all duration-200 hover:cursor-pointer ${
          locale === "en" 
            ? "text-sol-accent font-bold" 
            : "text-sol-muted hover:text-sol-text"
        }`}
      >
        English
      </button>

      <span className="text-sol-border/30 select-none">|</span>

      <button
        onClick={() => handleLanguageChange("vi")}
        className={`transition-all duration-200 hover:cursor-pointer ${
          locale === "vi" 
            ? "text-sol-accent font-bold" 
            : "text-sol-muted hover:text-sol-text"
        }`}
      >
        Tiếng Việt
      </button>
    </div>
  );
}