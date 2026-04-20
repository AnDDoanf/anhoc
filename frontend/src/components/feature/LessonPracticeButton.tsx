"use client";

import { useState } from "react";
import { PlayCircle, Loader2, ChevronDown } from "lucide-react";
import { lessonService } from "@/services/lessonService";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface LessonPracticeButtonProps {
  lessonId: string;
}

export default function LessonPracticeButton({ lessonId }: LessonPracticeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const router = useRouter();
  const t = useTranslations("Practice"); // Will map to Practice/Test dictionary

  const handleStartPractice = async () => {
    setLoading(true);
    try {
      const attempt = await lessonService.startPractice(lessonId, difficulty);
      // Route to the new attempt runner page
      router.push(`/student/practice/${attempt.id}`);
    } catch (error: any) {
      console.error("Failed to start practice:", error);
      alert(error.response?.data?.error || "Failed to start practice session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-sol-border/10 space-y-6">
      <div className="space-y-3">
        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-sol-muted px-1">
          {t("difficulty")}
        </label>
        <div className="relative group/select">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={loading}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg/50 px-5 py-4 text-sm font-bold text-sol-text outline-none transition-all focus:border-sol-accent/50 focus:ring-4 focus:ring-sol-accent/5 appearance-none disabled:opacity-50"
          >
            <option value="all">{t("allDifficulties")}</option>
            <option value="easy">{t("difficultyOptions.easy")}</option>
            <option value="medium">{t("difficultyOptions.medium")}</option>
            <option value="hard">{t("difficultyOptions.hard")}</option>
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-sol-muted group-hover/select:text-sol-accent transition-colors">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <button
        onClick={handleStartPractice}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-sol-accent text-sol-bg rounded-[1.5rem] font-black text-base hover:bg-sol-accent/90 transition-all shadow-xl shadow-sol-accent/20 hover:shadow-sol-accent/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <div className="relative flex items-center gap-3">
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <PlayCircle size={22} className="group-hover:scale-110 transition-transform duration-500" />
          )}
          <span>{loading ? t("starting") : t("startPractice")}</span>
        </div>
      </button>
    </div>
  );
}
