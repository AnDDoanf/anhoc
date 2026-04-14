"use client";

import { Achievement, achievementService } from "@/services/achievementService";
import { Loader2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import AchievementCard from "./AchievementCard";

export default function AchievementGallery() {
  const t = useTranslations("Achievements");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const data = await achievementService.getAll();
      setAchievements(data);
    } catch (err) {
      console.error("Failed to load achievements", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["all", "progress", "performance", "streak", "time", "speed", "social", "recovery"];
  const filtered = filter === "all" ? achievements : achievements.filter(a => a.category === filter);
  const earnedCount = achievements.filter(a => a.earned).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={40} className="text-sol-accent animate-spin" />
        <p className="text-sol-muted animate-pulse font-medium">{t("polishing")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden md:space-y-12">
      {/* Header & Stats - Stacked on Mobile, Row on Desktop */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
            <Trophy size={11} />
            <span>{t("title")}</span>
          </div>
          <h2 className="max-w-[11ch] text-[1.7rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-3xl md:max-w-none md:text-5xl">
            {t("hallTitle")}
          </h2>
          <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:max-w-2xl md:text-xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Stats Card - Optimized for narrow screens */}
        <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-sol-border/10 bg-sol-surface p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:gap-4 sm:p-4 md:rounded-[2rem] md:p-6 lg:w-auto lg:min-w-[220px] lg:justify-start lg:gap-6">
           <div className="text-center sm:min-w-[70px]">
             <div className="text-xl font-black text-sol-accent sm:text-2xl md:text-3xl">{earnedCount}</div>
             <div className="text-[9px] font-bold text-sol-muted uppercase tracking-wider">{t("collected")}</div>
           </div>
           <div className="hidden h-8 w-px bg-sol-border/20 sm:block" />
           <div className="text-center sm:min-w-[70px]">
             <div className="text-xl font-black text-sol-text sm:text-2xl md:text-3xl">{achievements.length}</div>
             <div className="text-[9px] font-bold text-sol-muted uppercase tracking-wider">{t("total")}</div>
           </div>
        </div>
      </div>

      {/* Filter Tabs - Forced Scroll with No-Scrollbar */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-sol-border/5 bg-sol-surface/50 p-1 no-scrollbar sm:flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap transition-all sm:px-3 sm:py-2 sm:text-xs md:px-4 md:text-sm
              ${filter === cat 
                ? "bg-sol-accent text-sol-bg shadow-md" 
                : "text-sol-muted hover:text-sol-text"
              }
            `}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Grid - 1 col on mobile, 2 on tablet, 3+ on desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(a => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
