"use client";

import { useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";
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
    <div className="mt-8 pt-6 border-t border-sol-border/10 space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-sol-muted">
          {t("difficulty")}
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={loading}
          className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-bold text-sol-text outline-none transition-all focus:ring-2 focus:ring-sol-accent/30 disabled:opacity-50"
        >
          <option value="all">{t("allDifficulties")}</option>
          <option value="easy">{t("difficultyOptions.easy")}</option>
          <option value="medium">{t("difficultyOptions.medium")}</option>
          <option value="hard">{t("difficultyOptions.hard")}</option>
        </select>
      </div>
      <button
        onClick={handleStartPractice}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-sol-accent text-sol-bg rounded-2xl font-bold text-sm hover:bg-sol-accent/90 transition-all shadow-md hover:shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <PlayCircle size={18} className="group-hover:scale-110 transition-transform" />
        )}
        <span>{loading ? t("starting") : t("startPractice")}</span>
      </button>
    </div>
  );
}
