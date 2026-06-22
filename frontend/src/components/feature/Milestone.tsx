// src/components/feature/Milestone.tsx
"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Clock
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LessonMastery } from "@/services/lessonService";

interface MilestoneProps {
  lessonId: string;
  gradeId: string;
  title: string;
  index: number;
  isEven: boolean;
  isLast: boolean;
  mastery?: LessonMastery;
}

export default function Milestone({
  lessonId,
  gradeId,
  title,
  index,
  isEven,
  isLast,
  mastery
}: MilestoneProps) {
  const t = useTranslations("Path");
  const commonT = useTranslations("Common");
  const isPassed = mastery?.completion_status === "completed";
  const accentTextClass = isPassed ? "text-green-500" : "text-sol-accent";
  const accentBorderClass = isPassed ? "border-green-500/25" : "border-sol-accent/20";
  const accentBgClass = isPassed ? "bg-green-500/10" : "bg-sol-accent/10";
  const accentConnectorClass = isPassed ? "from-green-500/60 to-green-500/20" : "from-sol-accent/60 to-sol-accent/20";
  const accentButtonClass = isPassed
    ? "border-green-500/20 bg-green-500/10 text-green-500 hover:border-green-500 hover:bg-green-500 hover:text-sol-bg"
    : "border-sol-border/10 bg-sol-surface text-sol-text hover:border-sol-accent hover:bg-sol-accent hover:text-sol-bg";

  return (
    <div className="relative flex min-h-[220px] w-full items-center justify-center sm:min-h-[260px] md:min-h-[300px]">
      {!isLast && (
        <div className={`absolute left-1/2 top-1/2 z-0 h-full w-1 -translate-x-1/2 bg-gradient-to-b sm:w-1.5 ${accentConnectorClass}`} />
      )}

      <div className={`relative z-10 flex w-full max-w-5xl flex-col items-center gap-6 md:flex-row md:gap-20 
        ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
      >
        <div className={`flex-1 w-full space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 md:space-y-6 ${isEven ? "md:text-right" : "md:text-left"}`}>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] sm:px-4 sm:py-2 sm:text-xs sm:tracking-widest ${accentBorderClass} ${accentBgClass} ${accentTextClass} border`}>
            {isPassed && <Check size={12} />}
            <span>{t("step", { n: index })}</span>
          </div>

          <h3 className={`text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl ${isPassed ? "text-green-100" : "text-sol-text"}`}>
            {title}
          </h3>

          <div className={`flex flex-wrap items-center gap-4 text-xs text-sol-muted sm:gap-6 sm:text-sm ${isEven ? "md:justify-end" : "md:justify-start"}`}>
            <span className="flex items-center gap-2">
              <Clock size={16} className={accentTextClass} />
              {t("estimatedTime", { min: 45 })}
            </span>
            <span className="flex items-center gap-2">
              <BookOpen size={16} className={accentTextClass} />
              {commonT("format")}
            </span>
          </div>

          <Link
            prefetch={false}
            href={`/student/learning/${gradeId}/${lessonId}`}
            className={`group inline-flex items-center gap-3 rounded-2xl border px-5 py-3 font-bold shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:px-8 sm:py-4 ${accentButtonClass}`}
          >
            <span>{t("startLesson")}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative flex w-20 items-center justify-center sm:w-24 md:w-40">
          <div className={`group z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 bg-sol-bg transition-transform duration-500 hover:scale-110 sm:h-16 sm:w-16 md:h-20 md:w-20 ${isPassed ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]" : "border-sol-accent shadow-[0_0_30px_rgba(var(--sol-accent-rgb),0.3)]"}`}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sol-bg sm:h-8 sm:w-8 md:h-10 md:w-10 ${isPassed ? "bg-green-500" : "bg-sol-accent"}`}>
              {isPassed ? <Check size={18} className="sm:h-5 sm:w-5" /> : <span className="text-base font-black sm:text-lg">{index}</span>}
            </div>
          </div>

          <div className={`absolute h-20 w-20 animate-ping rounded-full opacity-20 sm:h-24 sm:w-24 md:h-32 md:w-32 ${isPassed ? "bg-green-500/10" : "bg-sol-accent/10"}`} />
        </div>

        <div className="hidden md:block flex-1" />
      </div>
    </div>
  );
}
