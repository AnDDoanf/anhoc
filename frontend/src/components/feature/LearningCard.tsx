// src/components/feature/LearningCard.tsx
"use client";

import {
  Book,
  Bookmark,
  ChevronRight,
  Clock,
  Layers
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface LearningCardProps {
  lessonId: string;
  gradeId: string;
  title: string;
  index: number;
}

export default function LearningCard({ lessonId, gradeId, title, index }: LearningCardProps) {
  const t = useTranslations("Learning");
  const commonT = useTranslations("Common");
  const pathT = useTranslations("Path");

  return (
    <Link
      href={`/student/learning/${gradeId}/${lessonId}`}
      className="group relative block bg-sol-surface/30 rounded-[2rem] p-8 border border-sol-border/5 hover:border-sol-accent/30 shadow-sm hover:shadow-2xl hover:bg-sol-surface/50 transition-all duration-500 overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Book size={100} className="text-sol-accent -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Index & Category */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sol-accent/10 border border-sol-accent/20 flex items-center justify-center text-sol-accent font-black">
              {index}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sol-muted">
              {t("section", { n: index })}
            </span>
          </div>
          <Bookmark size={18} className="text-sol-muted group-hover:text-sol-accent transition-colors" />
        </div>

        {/* Title */}
        <div className="flex-grow">
          <h3 className="text-2xl font-bold text-sol-text leading-tight group-hover:text-sol-accent transition-colors mb-4">
            {title}
          </h3>
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-6 pt-6 border-t border-sol-border/5">
          <div className="flex items-center gap-2 text-xs text-sol-muted">
            <Layers size={14} className="text-sol-accent" />
            <span>{commonT("comprehensive")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-sol-muted">
            <Clock size={14} className="text-sol-accent" />
            <span>{pathT("estimatedTime", { min: 45 })}</span>
          </div>
        </div>

        {/* Continuous Learning Button (CTA) */}
        <div className="mt-8 flex items-center justify-between text-sol-accent font-bold text-sm">
          <span>{t("viewLesson")}</span>
          <div className="w-10 h-10 rounded-full border border-sol-accent/20 flex items-center justify-center group-hover:bg-sol-accent group-hover:text-sol-bg transition-all duration-500">
            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
