"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { achievementService, Achievement } from "@/services/achievementService";
import AchievementCard from "./AchievementCard";
import { Trophy, Filter, Loader2 } from "lucide-react";

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

  const categories = [
    "all", "progress", "performance", "streak", "time", "speed", "social", "recovery"
  ];

  const filtered = filter === "all" 
    ? achievements 
    : achievements.filter(a => a.category === filter);

  const earnedCount = achievements.filter(a => a.earned).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={40} className="text-sol-accent animate-spin" />
        <p className="text-sol-muted animate-pulse font-medium">Polishing trophies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-xs font-bold uppercase tracking-widest">
            <Trophy size={14} />
            <span>{t("title")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-sol-text tracking-tight">
            Hall of Achievements
          </h2>
          <p className="text-xl text-sol-muted max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="bg-sol-surface p-6 rounded-[2rem] border border-sol-border/10 shadow-sm flex items-center gap-6">
           <div className="text-center">
             <div className="text-3xl font-black text-sol-accent">{earnedCount}</div>
             <div className="text-[10px] font-bold text-sol-muted uppercase tracking-wider">Collected</div>
           </div>
           <div className="w-px h-10 bg-sol-border/20" />
           <div className="text-center">
             <div className="text-3xl font-black text-sol-text">{achievements.length}</div>
             <div className="text-[10px] font-bold text-sol-muted uppercase tracking-wider">Total</div>
           </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-sol-surface/50 rounded-2xl border border-sol-border/5 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
              ${filter === cat 
                ? "bg-sol-accent text-sol-bg shadow-lg shadow-sol-accent/20" 
                : "text-sol-muted hover:text-sol-text hover:bg-sol-surface"
              }
            `}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(a => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
