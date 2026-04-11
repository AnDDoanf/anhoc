// src/components/feature/Milestone.tsx
"use client";

import {
  ArrowRight,
  BookOpen,
  Clock
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface MilestoneProps {
  lessonId: string;
  gradeId: string;
  title: string;
  index: number;
  isEven: boolean;
  isLast: boolean;
}

export default function Milestone({
  lessonId,
  gradeId,
  title,
  index,
  isEven,
  isLast
}: MilestoneProps) {
  const t = useTranslations("Path");
  const commonT = useTranslations("Common");

  return (
    <div className={`relative flex items-center justify-center w-full min-h-[300px] py-10 md:py-20 lg:py-24`}>
      {!isLast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1.5 h-full bg-gradient-to-b from-sol-accent/60 to-sol-accent/20 z-0" />
      )}

      <div className={`relative z-10 flex flex-col md:flex-row items-center w-full max-w-5xl gap-10 md:gap-20 
        ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
      >
        <div className={`flex-1 w-full space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 ${isEven ? "md:text-right" : "md:text-left"}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-xs font-bold uppercase tracking-widest`}>
            {t("step", { n: index })}
          </div>

          <h3 className="text-3xl md:text-4xl font-black text-sol-text tracking-tight leading-tight">
            {title}
          </h3>

          <div className={`flex items-center gap-6 text-sm text-sol-muted ${isEven ? "md:justify-end" : "md:justify-start"}`}>
            <span className="flex items-center gap-2">
              <Clock size={16} className="text-sol-accent" />
              {t("estimatedTime", { min: 45 })}
            </span>
            <span className="flex items-center gap-2">
              <BookOpen size={16} className="text-sol-accent" />
              {commonT("format")}
            </span>
          </div>

          <Link
            prefetch={false}
            href={`/student/learning/${gradeId}/${lessonId}`}
            className={`inline-flex items-center gap-3 px-8 py-4 bg-sol-surface border border-sol-border/10 rounded-2xl font-bold text-sol-text hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1 group`}
          >
            <span>{t("startLesson")}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative flex items-center justify-center w-24 md:w-40">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-sol-bg border-4 border-sol-accent flex items-center justify-center z-20 shadow-[0_0_30px_rgba(var(--sol-accent-rgb),0.3)] group hover:scale-110 transition-transform duration-500">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-sol-accent flex items-center justify-center text-sol-bg">
              <span className="font-black text-lg">{index}</span>
            </div>
          </div>

          <div className="absolute w-24 h-24 md:w-32 md:h-32 bg-sol-accent/10 rounded-full animate-ping opacity-20" />
        </div>

        <div className="hidden md:block flex-1" />
      </div>
    </div>
  );
}
