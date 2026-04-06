"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function Footer() {
  const locale = useLocale();
  const router = useRouter();

  const handleLanguageChange = (newLocale: string) => {
    // 1. Set the cookie so the server knows which language to load next time
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // 2. Refresh the page to reload the dictionary from getMessages()
    router.refresh();
  };

  return (
    <footer className="w-full py-6 border-t border-sol-border/20 bg-sol-surface mt-auto">
      <div className="max-w-[440px] mx-auto px-4 flex justify-between items-center text-sm text-sol-muted">
        <p>© 2026 Your App</p>
        
        <div className="flex gap-4">
          <button
            onClick={() => handleLanguageChange("en")}
            className={`transition-colors ${
              locale === "en" ? "text-sol-accent font-bold" : "hover:text-sol-text"
            }`}
          >
            English
          </button>
          
          <span className="text-sol-border/50">|</span>
          
          <button
            onClick={() => handleLanguageChange("vi")}
            className={`transition-colors ${
              locale === "vi" ? "text-sol-accent font-bold" : "hover:text-sol-text"
            }`}
          >
            Tiếng Việt
          </button>
        </div>
      </div>
    </footer>
  );
}