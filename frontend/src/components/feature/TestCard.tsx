// src/components/feature/TestCard.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Target,
  Medal,
  Timer,
  ClipboardCheck,
  HelpCircle,
  History,
  Loader2,
  Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { testService } from "@/services/testService";
import { format } from "date-fns";

interface TestCardProps {
  test: {
    grade_id: number;
    grade_slug: string;
    title_en: string;
    title_vi: string;
    description_en: string;
    description_vi: string;
    questionCount: number;
    availableTemplateCount?: number;
    lessonCount?: number;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    iconType: "timer" | "medal" | "target";
    attempts?: {
      id: string;
      total_score: number | null;
      is_completed: boolean | null;
      started_at: string;
      completed_at?: string | null;
      questionCount: number;
    }[];
  };
}

export default function TestCard({ test }: TestCardProps) {
  const t = useTranslations("Test");
  const diffT = useTranslations("Difficulty");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "medal": return <Medal size={20} />;
      case "timer": return <Timer size={20} />;
      case "target": return <Target size={20} />;
      default: return <ClipboardCheck size={20} />;
    }
  };

  const difficultyColor = {
    Beginner: "text-sol-green bg-sol-green/10 border-sol-green/20",
    Intermediate: "text-sol-accent bg-sol-accent/10 border-sol-accent/20",
    Advanced: "text-sol-orange bg-sol-orange/10 border-sol-orange/20",
  };

  const title = locale === "vi" ? test.title_vi : test.title_en;
  const description = locale === "vi" ? test.description_vi : test.description_en;
  const attempts = test.attempts || [];

  const handleStart = async () => {
    setLoading(true);
    try {
      const attempt = await testService.startGradeTest(test.grade_id);
      router.push(`/student/practice/${attempt.id}`);
    } catch (error: any) {
      console.error("Failed to start test:", error);
      alert(error.response?.data?.error || t("startError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative bg-sol-surface/30 rounded-3xl p-6 border border-sol-border/10 shadow-sm hover:shadow-2xl hover:bg-sol-surface/50 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
      {/* Decorative Gradient Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-sol-accent/5 rounded-full blur-3xl group-hover:bg-sol-accent/10 transition-colors" />

      <div className="relative z-10 space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl bg-sol-surface border border-sol-border/10 text-sol-accent shadow-sm group-hover:scale-110 transition-transform duration-500`}>
            {getIcon(test.iconType)}
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${difficultyColor[test.difficulty]}`}>
            {diffT(test.difficulty)}
          </div>
        </div>

        <div className="min-h-[100px]">
          <h3 className="text-xl font-bold text-sol-text group-hover:text-sol-accent transition-colors">
            {title}
          </h3>
          <p className="text-sm text-sol-muted line-clamp-2 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-1.5 text-xs text-sol-muted bg-sol-bg/40 px-3 py-1.5 rounded-xl border border-sol-border/5">
            <HelpCircle size={14} className="text-sol-accent" />
            <span>{t("stats", { count: test.questionCount })}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="flex items-center justify-between w-full mt-4 px-6 py-3 bg-sol-text text-sol-bg rounded-2xl font-bold text-sm hover:bg-sol-accent hover:text-sol-bg transition-all group/btn shadow-md hover:shadow-sol-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loading ? t("starting") : t("startBtn")}</span>
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
          )}
        </button>

        <div className="border-t border-sol-border/10 pt-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sol-muted">
            <History size={13} className="text-sol-accent" />
            {t("attemptLog")}
          </div>

          {attempts.length === 0 ? (
            <p className="rounded-2xl border border-sol-border/10 bg-sol-bg/30 px-3 py-3 text-xs font-bold text-sol-muted">
              {t("noAttempts")}
            </p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => router.push(`/student/practice/${attempt.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sol-border/10 bg-sol-bg/30 px-3 py-3 text-left transition-colors hover:border-sol-accent/30 hover:bg-sol-surface"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-sol-text">
                      {attempt.is_completed ? t("completedAttempt") : t("inProgressAttempt")}
                    </div>
                    <div className="text-[10px] font-bold text-sol-muted">
                      {format(new Date(attempt.started_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-sol-surface px-2 py-1 text-xs font-black text-sol-accent">
                    <Trophy size={12} />
                    {attempt.is_completed && attempt.total_score !== null
                      ? `${Math.round(attempt.total_score)}%`
                      : t("resumeAttempt")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
