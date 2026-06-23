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
  const accentTextClass = isPassed ? "text-sol-green" : "text-sol-accent";
  const accentBorderClass = isPassed ? "border-sol-green/25" : "border-sol-accent/20";
  const accentBgClass = isPassed ? "bg-sol-green/10" : "bg-sol-accent/10";
  const accentConnectorClass = isPassed ? "from-sol-green/60 to-sol-green/20" : "from-sol-accent/60 to-sol-accent/20";
  const accentButtonClass = isPassed
    ? "border-sol-green/20 bg-sol-green/10 text-sol-green hover:border-sol-green hover:bg-sol-green hover:text-sol-bg"
    : "border-sol-border/10 bg-sol-surface text-sol-text hover:border-sol-accent hover:bg-sol-accent hover:text-sol-bg";

  return (
    <div className="relative flex min-h-[220px] w-full items-center justify-start md:justify-center sm:min-h-[260px] md:min-h-[300px]">
      {!isLast && (
        <div className={`absolute left-10 sm:left-12 md:left-1/2 top-[60px] sm:top-[66px] md:top-1/2 z-0 h-full w-1 -translate-x-1/2 bg-gradient-to-b sm:w-1.5 ${accentConnectorClass}`} />
      )}

      <div className={`relative z-10 flex w-full max-w-5xl flex-col items-start gap-6 pl-20 pr-4 sm:pl-24 sm:pr-6 md:flex-row md:items-center md:gap-20 md:px-4
        ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
      >
        <div className={`flex-1 w-full space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 md:space-y-6 ${isEven ? "md:text-right" : "md:text-left"} pt-10 sm:pt-14 md:pt-0`}>
          <h3 className={`text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl ${isPassed ? "text-sol-green" : "text-sol-text"}`}>
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

        <div className="absolute left-10 sm:left-12 top-8 sm:top-10 -translate-x-1/2 md:relative md:left-auto md:top-auto md:translate-x-0 md:translate-y-0 flex w-20 items-center justify-center sm:w-24 md:w-40">
          <div className={`group z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 bg-sol-bg transition-transform duration-500 hover:scale-110 sm:h-16 sm:w-16 md:h-20 md:w-20 ${isPassed ? "border-sol-green shadow-[0_0_30px_rgba(var(--sol-green-rgb),0.3)]" : "border-sol-accent shadow-[0_0_30px_rgba(var(--sol-accent-rgb),0.3)]"}`}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sol-bg sm:h-8 sm:w-8 md:h-10 md:w-10 ${isPassed ? "bg-sol-green" : "bg-sol-accent"}`}>
              {isPassed ? <Check size={18} className="sm:h-5 sm:w-5" /> : <span className="text-base font-black sm:text-lg">{index}</span>}
            </div>
          </div>

          <div className={`absolute h-20 w-20 animate-ping rounded-full opacity-20 sm:h-24 sm:w-24 md:h-32 md:w-32 ${isPassed ? "bg-sol-green/10" : "bg-sol-accent/10"}`} />
        </div>

        <div className="hidden md:block flex-1" />
      </div>
    </div>
  );
}
