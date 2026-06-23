"use client";

import { useState } from "react";
import { PlayCircle, Loader2, ChevronDown, Download, X, BookOpen, ClipboardList } from "lucide-react";
import { lessonService } from "@/services/lessonService";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { exportWorksheetPDF, exportLessonPDF } from "@/utils/pdfExporter";

interface LessonPracticeButtonProps {
  lesson: {
    id: string;
    title_en: string;
    title_vi: string;
  };
  passed70?: boolean;
}

export default function LessonPracticeButton({ lesson, passed70 = false }: LessonPracticeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Practice"); // Will map to Practice/Test dictionary

  const handleStartPractice = async () => {
    setLoading(true);
    try {
      const attempt = await lessonService.startPractice(lesson.id, difficulty);
      // Route to the new attempt runner page
      router.push(`/student/practice/${attempt.id}`);
    } catch (error: any) {
      console.error("Failed to start practice:", error);
      alert(error.response?.data?.error || "Failed to start practice session.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPractice = async () => {
    setIsModalOpen(false);
    setExporting(true);
    try {
      const questions = await lessonService.exportQuestions(lesson.id);
      const docTitle = locale === "vi"
        ? `Bảng bài tập: ${lesson.title_vi}`
        : `Worksheet: ${lesson.title_en}`;
      await exportWorksheetPDF(docTitle, questions, locale, false);
    } catch (error: any) {
      console.error("Failed to export PDF:", error);
      alert(error.response?.data?.error || "Failed to export PDF worksheet.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportLesson = async () => {
    setIsModalOpen(false);
    setExporting(true);
    try {
      const fullLesson = await lessonService.getById(lesson.id);
      const markdown = locale === "vi" ? fullLesson.content_markdown_vi : fullLesson.content_markdown_en;
      const title = locale === "vi" ? fullLesson.title_vi : fullLesson.title_en;
      await exportLessonPDF(title, markdown, locale);
    } catch (error: any) {
      console.error("Failed to export lesson PDF:", error);
      alert(error.response?.data?.error || "Failed to export lesson content.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-sol-border/10 space-y-6">
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

      <div className="space-y-3">
        <button
          onClick={handleStartPractice}
          disabled={loading || exporting}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative border ${
            passed70
              ? "bg-sol-green/10 text-sol-green border-sol-green/20 hover:bg-sol-green hover:text-sol-bg hover:border-sol-green shadow-sm shadow-sol-green/5"
              : "bg-sol-accent/10 text-sol-accent border-sol-accent/20 hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent shadow-sm shadow-sol-accent/5"
          }`}
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <div className="relative flex items-center gap-3">
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <PlayCircle size={22} className="group-hover:scale-110 transition-transform duration-500" />
            )}
            <span>{loading ? t("starting") : passed70 ? t("reviewBtn") : t("startPractice")}</span>
          </div>
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={loading || exporting}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-sol-accent/20 bg-sol-accent/10 text-sol-accent rounded-[1.5rem] font-black text-sm hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative shadow-sm"
        >
          <div className="relative flex items-center gap-3">
            {exporting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            <span>{exporting ? t("exporting") : t("exportPDF")}</span>
          </div>
        </button>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-sol-bg/85 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-sol-surface border border-sol-border/20 rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200 text-sol-text z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sol-border/10 pb-4">
              <h3 className="text-lg font-black tracking-tight uppercase text-sol-text">
                {t("exportOptionsTitle")}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-sol-accent/10 hover:text-sol-accent text-sol-muted rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Options Body */}
            <div className="flex flex-col gap-4">
              {/* Option 1: Lesson Content */}
              <button
                onClick={handleExportLesson}
                className="w-full flex items-start gap-4 p-4 rounded-[1.5rem] bg-sol-bg/50 border border-sol-border/10 hover:border-sol-accent/30 hover:bg-sol-accent/5 transition-all text-left group"
              >
                <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-xl group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-sol-text group-hover:text-sol-accent transition-colors">
                    {t("exportLessonOption")}
                  </h4>
                  <p className="text-xs text-sol-muted mt-1 font-medium leading-relaxed">
                    {t("exportLessonOptionDesc")}
                  </p>
                </div>
              </button>

              {/* Option 2: Practice Worksheet */}
              <button
                onClick={handleExportPractice}
                className="w-full flex items-start gap-4 p-4 rounded-[1.5rem] bg-sol-bg/50 border border-sol-border/10 hover:border-sol-accent/30 hover:bg-sol-accent/5 transition-all text-left group"
              >
                <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-xl group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-sol-text group-hover:text-sol-accent transition-colors">
                    {t("exportPracticeOption")}
                  </h4>
                  <p className="text-xs text-sol-muted mt-1 font-medium leading-relaxed">
                    {t("exportPracticeOptionDesc")}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
