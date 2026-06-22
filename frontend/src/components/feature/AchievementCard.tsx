"use client";

import { useTranslations, useLocale } from "next-intl";
import { 
  Trophy, 
  Lock, 
  CheckCircle2, 
  User, 
  Flame, 
  Zap, 
  Target, 
  BookCheck, 
  GraduationCap, 
  Star, 
  Award, 
  Crown, 
  Rocket, 
  Shield, 
  TrendingUp, 
  Calendar, 
  Swords, 
  Infinity, 
  Sunrise, 
  Moon, 
  Brain, 
  Timer, 
  Gauge, 
  Wind, 
  BatteryCharging, 
  MessageSquare, 
  Heart, 
  PenTool, 
  Compass, 
  Sparkles, 
  RefreshCw, 
  Diamond,
  Fingerprint,
  Footprints
} from "lucide-react";
import { Achievement, ThemeUnlock } from "@/services/achievementService";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

const iconMap: any = {
  Trophy, Lock, CheckCircle2, User, Flame, Zap, Target, BookCheck, GraduationCap,
  Star, Award, Crown, Rocket, Shield, TrendingUp, Calendar, Swords, Infinity,
  Sunrise, Moon, Brain, Timer, Gauge, Wind, BatteryCharging, MessageSquare,
  Heart, PenTool, Compass, Sparkles, RefreshCw, Diamond, Fingerprint, Footprints
};

interface AchievementCardProps {
  achievement: Achievement;
  activeThemeSlug?: string;
  onActivateTheme?: (theme: ThemeUnlock) => void;
  onClearTheme?: () => void;
}

export default function AchievementCard({
  achievement,
  activeThemeSlug,
  onActivateTheme,
  onClearTheme,
}: AchievementCardProps) {
  const t = useTranslations("Achievements");
  const locale = useLocale();
  const IconComponent = iconMap[achievement.icon || "Trophy"] || Trophy;

  const title = locale === "vi" ? achievement.title_vi : achievement.title_en;
  const description = locale === "vi" ? achievement.description_vi : achievement.description_en;
  const themeTitle = achievement.theme
    ? (locale === "vi" ? achievement.theme.title_vi : achievement.theme.title_en)
    : "";
  const isThemeActive = !!achievement.theme && achievement.theme.slug === activeThemeSlug;

  const dateLocale = locale === "vi" ? vi : enUS;

  return (
    <div className={`group relative overflow-hidden rounded-[1.75rem] border transition-all duration-700 sm:rounded-[2rem]
      ${achievement.earned 
        ? "bg-sol-surface border-sol-accent/30 shadow-2xl hover:shadow-sol-accent/20 hover:-translate-y-2" 
        : "bg-sol-surface/30 border-sol-border/20 grayscale-[0.8] opacity-60 hover:opacity-80"
      }
    `}>
      {/* Decorative Glow Background */}
      {achievement.earned && (
        <div className="absolute -right-20 -top-20 h-64 w-64 bg-sol-accent/10 blur-[100px] transition-opacity duration-1000 group-hover:opacity-100 opacity-50" />
      )}

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-8">
        <div className="mb-4 flex items-start justify-between sm:mb-8">
          <div className={`relative flex h-12 w-12 items-center justify-center rounded-[1.2rem] shadow-inner transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl
            ${achievement.earned 
              ? "bg-sol-accent/10 border border-sol-accent/30 text-sol-accent" 
              : "bg-sol-bg border border-sol-border/20 text-sol-muted"
            }
          `}>
            <div className={`absolute inset-0 rounded-[1.2rem] blur-lg transition-opacity duration-700 sm:rounded-2xl ${achievement.earned ? "bg-sol-accent/20 opacity-0 group-hover:opacity-100" : "bg-transparent"}`} />
            {achievement.earned ? <IconComponent size={22} className="relative z-20 sm:h-7 sm:w-7" /> : <Lock size={22} className="relative z-20 sm:h-7 sm:w-7" />}
          </div>

          {achievement.earned ? (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sol-accent text-sol-bg shadow-lg transform scale-100 transition-transform duration-500 group-hover:scale-125 sm:h-6 sm:w-6">
              <CheckCircle2 size={12} strokeWidth={4} />
            </div>
          ) : (
             <div className="h-2 w-2 rounded-full bg-sol-border/20" />
          )}
        </div>

        <div className="flex-1 space-y-2 sm:space-y-3">
           <h3 className={`text-base font-black transition-colors tracking-tight leading-tight sm:text-xl
             ${achievement.earned ? "text-sol-text group-hover:text-sol-accent" : "text-sol-muted"}
           `}>
             {title}
           </h3>
           <p className="text-xs font-medium leading-relaxed text-sol-muted line-clamp-2 sm:text-sm sm:line-clamp-3">
             {description}
           </p>
           {achievement.theme && (
              <div className="rounded-[1.2rem] border border-sol-border/20 bg-sol-bg p-2 sm:rounded-2xl sm:p-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-sm sm:h-4 sm:w-4"
                    style={{ backgroundColor: achievement.theme.preview_color || "var(--accent)" }}
                  />
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sol-muted sm:text-[10px] sm:tracking-[0.2em]">
                      {t("themeUnlock")}
                    </div>
                    <div className="truncate text-xs font-black text-sol-text sm:text-sm">
                      {themeTitle}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="mt-4 border-t border-sol-border/20 pt-3 sm:mt-8 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
            <span className={`rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all sm:px-4 sm:py-1.5 sm:text-[10px] sm:tracking-[0.15em]
              ${achievement.earned 
                ? "bg-sol-accent/10 text-sol-accent border border-sol-accent/20" 
                : "bg-sol-bg text-sol-muted border border-sol-border/20"
              }
            `}>
              {t(`categories.${achievement.category}`)}
            </span>
            
            {achievement.earned && achievement.earned_at ? (
              <div className="flex items-center gap-1.5 text-sol-muted/60">
                <Calendar size={12} />
                <span className="text-[9px] font-bold sm:text-[10px]">
                   {t("earned", { date: format(new Date(achievement.earned_at), locale === "vi" ? "d MMM, yyyy" : "MMM d, yyyy", { locale: dateLocale }) })}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-sol-muted/40 animate-pulse">
                {t("locked")}
              </span>
            )}
          </div>

          {achievement.earned && achievement.theme && onActivateTheme && (
            <button
              type="button"
              onClick={() => {
                if (isThemeActive) {
                  onClearTheme?.();
                  return;
                }
                onActivateTheme(achievement.theme!);
              }}
              className={`mt-2.5 w-full rounded-[1.2rem] px-4 py-2 text-xs font-black transition sm:mt-4 sm:rounded-2xl sm:py-3 sm:text-sm
                ${isThemeActive
                  ? "bg-sol-accent text-sol-bg"
                  : "border border-sol-border/20 bg-sol-surface text-sol-text hover:border-sol-accent/40 hover:text-sol-accent"
                }
              `}
            >
              {isThemeActive ? t("backToDefault") : t("activateTheme")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
