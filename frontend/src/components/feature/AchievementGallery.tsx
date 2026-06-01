"use client";

import { Achievement, achievementService, ThemeUnlock } from "@/services/achievementService";
import { Loader2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import AchievementCard from "./AchievementCard";
import Hero from "@/components/ui/Hero";
import { APP_THEME_EVENT, applyStoredTheme, getStoredAppTheme, StoredAppTheme } from "@/lib/appTheme";

export default function AchievementGallery() {
  const t = useTranslations("Achievements");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState({ total: 0, earned: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeThemeSlug, setActiveThemeSlug] = useState<string>(() => getStoredAppTheme()?.slug || "default");

  const fetchAchievements = useCallback(async (nextPage = 1, append = false, category = filter) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await achievementService.getAll({
        page: nextPage,
        pageSize: 10,
        category,
      });
      setAchievements((current) => append ? [...current, ...data.items] : data.items);
      setSummary(data.summary);
      setHasMore(data.pagination.hasMore);
      setPage(data.pagination.page);
    } catch (err) {
      console.error("Failed to load achievements", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    setPage(1);
    fetchAchievements(1, false, filter);
  }, [fetchAchievements, filter]);

  useEffect(() => {
    const syncTheme = (event?: Event) => {
      const customEvent = event as CustomEvent<{ theme?: StoredAppTheme | null }> | undefined;
      setActiveThemeSlug(customEvent?.detail?.theme?.slug || getStoredAppTheme()?.slug || "default");
    };

    syncTheme();
    window.addEventListener(APP_THEME_EVENT, syncTheme as EventListener);
    return () => window.removeEventListener(APP_THEME_EVENT, syncTheme as EventListener);
  }, []);

  const categories = ["all", "progress", "performance", "streak", "time", "speed", "social", "recovery", "special"];
  const earnedCount = summary.earned;
  const activateTheme = (theme: ThemeUnlock) => {
    applyStoredTheme({
      slug: theme.slug,
      title_en: theme.title_en,
      title_vi: theme.title_vi,
      preview_color: theme.preview_color,
      light_variables: theme.light_variables,
      dark_variables: theme.dark_variables,
    });
  };
  const clearTheme = () => {
    applyStoredTheme(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={40} className="text-sol-accent animate-spin" />
        <p className="text-sol-muted animate-pulse font-medium">{t("polishing")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header & Stats */}
      <Hero
        className="md:rounded-[3rem] overflow-hidden"
        containerClassName="relative z-10 flex w-full flex-col items-center gap-8 lg:flex-row lg:justify-between"
      >
        <div className="space-y-4 md:space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-sol-accent/30 bg-sol-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-sol-accent">
            <Trophy size={14} className="animate-bounce" />
            <span>{t("title")}</span>
          </div>
          <h2 className="text-4xl md:text-7xl font-black leading-[0.95] tracking-tighter text-sol-text max-w-[15ch] lg:max-w-none">
            {t("hallTitle")}
          </h2>
          <p className="max-w-2xl text-[14px] leading-relaxed text-sol-muted md:text-xl font-medium">
            {t("subtitle")}
          </p>
        </div>

        {/* Stats Card - Optimized for impact */}
        <div className="flex items-center gap-8 bg-sol-bg/40 backdrop-blur-2xl border border-sol-border/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
           <div className="absolute inset-0 bg-sol-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
           <div className="relative z-10 flex items-center gap-10">
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-black text-sol-accent tracking-tighter mb-1">{earnedCount}</div>
                <div className="text-[10px] font-black text-sol-muted uppercase tracking-[0.2em]">{t("collected")}</div>
              </div>
              <div className="h-16 w-[2px] bg-sol-accent/20 rounded-full" />
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-black text-sol-text tracking-tighter mb-1">{summary.total}</div>
                <div className="text-[10px] font-black text-sol-muted uppercase tracking-[0.2em]">{t("total")}</div>
              </div>
           </div>
        </div>
      </Hero>

      {/* Filter Tabs - Capsule Style */}
      <div className="flex w-full items-center gap-2 overflow-x-auto pb-4 no-scrollbar pt-2 sm:gap-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-1 shrink-0 flex items-center justify-center rounded-full px-4 h-11 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 min-w-[100px] sm:min-w-0
              ${filter === cat
                ? "bg-sol-accent text-sol-bg border-sol-accent shadow-[0_0_20px_rgba(var(--sol-accent-rgb),0.3)]"
                : "bg-sol-surface/30 text-sol-muted border-transparent hover:border-sol-border/10 hover:text-sol-text"
              }
            `}
          >
            <span className="leading-tight text-center">{t(`categories.${cat}`)}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {achievements.map(a => (
          <AchievementCard
            key={a.id}
            achievement={a}
            activeThemeSlug={activeThemeSlug}
            onActivateTheme={activateTheme}
            onClearTheme={clearTheme}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchAchievements(page + 1, true)}
            disabled={loadingMore}
            className="rounded-2xl border border-sol-border/20 bg-sol-surface px-6 py-3 text-sm font-black text-sol-text transition hover:border-sol-accent/40 hover:text-sol-accent disabled:opacity-60"
          >
            {loadingMore ? t("loadingMore") : t("showMore")}
          </button>
        </div>
      )}
    </div>
  );
}
