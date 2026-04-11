// src/components/feature/PracticeCard.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  BarChart2,
  Target,
  Calculator,
  Brain,
  Shapes,
  Hash
} from "lucide-react";
import LessonPracticeButton from "./LessonPracticeButton";

interface PracticeCardProps {
  lesson: {
    id: string;
    title_en: string;
    title_vi: string;
    _count?: {
      templates: number;
    }
  };
}

export default function PracticeCard({ lesson }: PracticeCardProps) {
  const t = useTranslations("Practice");
  const locale = useLocale();

  const getIcon = (id: string) => {
    // Deterministic icon based on ID for now, or could be based on subject
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const icons = [<Calculator key="1" size={20} />, <Brain key="2" size={20} />, <Shapes key="3" size={20} />, <Hash key="4" size={20} />];
    return icons[hash % icons.length];
  };

  const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
  const exerciseCount = lesson._count?.templates || 0;

  return (
    <div className="group relative bg-sol-surface/30 rounded-3xl p-6 border border-sol-border/10 shadow-sm hover:shadow-2xl hover:bg-sol-surface/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
      {/* Decorative Gradient Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-sol-accent/5 rounded-full blur-3xl group-hover:bg-sol-accent/10 transition-colors" />

      <div className="relative z-10 space-y-4 flex-grow">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl bg-sol-surface border border-sol-border/10 text-sol-accent shadow-sm group-hover:scale-110 transition-transform duration-500`}>
            {getIcon(lesson.id)}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-sol-text group-hover:text-sol-accent transition-colors">
            {title}
          </h3>
          <p className="text-sm text-sol-muted line-clamp-2 mt-2 leading-relaxed">
            Practice concepts from this lesson to master the curriculum.
          </p>
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-1.5 text-xs text-sol-muted bg-sol-bg/40 px-3 py-1.5 rounded-xl border border-sol-border/5">
            <BarChart2 size={14} className="text-sol-accent" />
            <span>{t("stats", { count: exerciseCount })}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <LessonPracticeButton lessonId={lesson.id} />
      </div>
    </div>
  );
}
