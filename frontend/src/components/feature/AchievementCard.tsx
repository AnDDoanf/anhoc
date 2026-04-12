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
import { Achievement } from "@/services/achievementService";
import { format } from "date-fns";

const iconMap: any = {
  Trophy, Lock, CheckCircle2, User, Flame, Zap, Target, BookCheck, GraduationCap,
  Star, Award, Crown, Rocket, Shield, TrendingUp, Calendar, Swords, Infinity,
  Sunrise, Moon, Brain, Timer, Gauge, Wind, BatteryCharging, MessageSquare,
  Heart, PenTool, Compass, Sparkles, RefreshCw, Diamond, Fingerprint, Footprints
};

interface AchievementCardProps {
  achievement: Achievement;
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const t = useTranslations("Achievements");
  const locale = useLocale();
  const IconComponent = iconMap[achievement.icon || "Trophy"] || Trophy;

  const title = locale === "vi" ? achievement.title_vi : achievement.title_en;
  const description = locale === "vi" ? achievement.description_vi : achievement.description_en;

  return (
    <div className={`group relative overflow-hidden rounded-[1.5rem] border p-4 transition-all duration-500 sm:rounded-[2rem] sm:p-6
      ${achievement.earned 
        ? "bg-sol-surface border-sol-accent/20 shadow-lg hover:shadow-sol-accent/10 hover:-translate-y-1" 
        : "bg-sol-surface/30 border-sol-border/5 grayscale opacity-70"
      }
    `}>
      {/* Category Gradient Background */}
      {achievement.earned && (
        <div className="absolute inset-0 bg-gradient-to-br from-sol-accent/5 to-transparent pointer-events-none" />
      )}

      <div className="relative z-10 space-y-4">
        <div className="flex justify-between items-start">
          <div className={`rounded-xl p-3 shadow-sm transition-transform duration-500 group-hover:scale-110 sm:rounded-2xl sm:p-4
            ${achievement.earned ? "bg-sol-accent/10 text-sol-accent" : "bg-sol-bg text-sol-muted"}
          `}>
            {achievement.earned ? <IconComponent size={24} /> : <Lock size={24} />}
          </div>
          {achievement.earned && (
            <div className="bg-sol-accent text-sol-bg p-1.5 rounded-full shadow-lg">
              <CheckCircle2 size={14} />
            </div>
          )}
        </div>

        <div>
           <h3 className={`text-base font-bold transition-colors sm:text-lg
             ${achievement.earned ? "text-sol-text group-hover:text-sol-accent" : "text-sol-muted"}
           `}>
             {title}
           </h3>
           <p className="mt-1 text-[13px] leading-relaxed text-sol-muted sm:text-sm">
             {description}
           </p>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="w-fit rounded-full bg-sol-accent/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sol-accent/60">
            {achievement.category}
          </span>
          {achievement.earned && achievement.earned_at ? (
            <span className="text-[10px] text-sol-muted sm:text-right">
               {t("earned", { date: format(new Date(achievement.earned_at), "MMM d, yyyy") })}
            </span>
          ) : (
            <span className="text-[10px] italic text-sol-muted sm:text-right">
              {t("locked")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
