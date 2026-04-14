"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { lessonService } from "@/services/lessonService";
import { testService } from "@/services/testService";
import PracticeCard from "@/components/feature/PracticeCard";
import PracticeResultModal from "@/components/feature/PracticeResultModal";
import { Sparkles, Trophy, BookOpen, Clock, Award, History as HistoryIcon, ArrowRight, Brain } from "lucide-react";
import { format } from "date-fns";

interface AvailableLesson {
  id: string;
  title_en: string;
  title_vi: string;
  grade?: {
    id: string;
    title_en: string;
    title_vi: string;
  };
  _count?: {
    templates: number;
  };
}

interface PracticeHistory {
  id: string;
  completed_at: string;
  total_score: number;
  lesson?: {
    title_en: string;
    title_vi: string;
    grade?: {
      title_en: string;
      title_vi: string;
    };
  };
}

export default function PracticePage() {
  const t = useTranslations("Practice");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [availableLessons, setAvailableLessons] = useState<AvailableLesson[]>([]);
  const [history, setHistory] = useState<PracticeHistory[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lessons, practiceHistory] = await Promise.all([
        lessonService.getAvailablePractices(),
        testService.getPracticeHistory()
      ]);
      setAvailableLessons(lessons);
      setHistory(practiceHistory);
    } catch (error) {
      console.error("Failed to fetch practice data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group practice data by grade
  const groupedData = availableLessons.reduce((acc, curr) => {
    const gradeId = curr.grade?.id || "other";
    if (!acc[gradeId]) acc[gradeId] = { 
      title: locale === "vi" ? curr.grade?.title_vi : curr.grade?.title_en,
      lessons: [] 
    };
    acc[gradeId].lessons.push(curr);
    return acc;
  }, {} as Record<string, { title?: string, lessons: AvailableLesson[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Clock className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-4 md:space-y-16 md:py-10">
      <PracticeResultModal 
        isOpen={!!selectedAttemptId} 
        onClose={() => setSelectedAttemptId(null)} 
        attemptId={selectedAttemptId} 
      />
      
      {/* Hero Header */}
      <header className="group relative overflow-hidden rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-5 sm:p-6 md:rounded-[3rem] md:p-16">
        <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform duration-1000 group-hover:scale-110 sm:p-6 md:p-10">
          <Trophy size={112} className="text-sol-accent md:h-40 md:w-40" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-3 md:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
            <Sparkles size={11} className="md:h-3.5 md:w-3.5" />
            <span>{t("hubBadge")}</span>
          </div>
          <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-4 xl:gap-12">
        
        {/* Available Practices List (3/4 on large screens) */}
        <div className="space-y-10 xl:col-span-3 xl:space-y-20">
          {Object.entries(groupedData).map(([gradeId, group]) => (
            <section key={gradeId} className="space-y-5 md:space-y-8">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sol-border/10 bg-sol-surface/50 text-sol-accent shadow-sm md:h-12 md:w-12 md:rounded-2xl">
                  <BookOpen size={20} className="md:h-6 md:w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-sol-text md:text-2xl">
                    {group.title || gradeId}
                  </h2>
                  <div className="h-1 w-12 bg-sol-accent rounded-full mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-8">
                {group.lessons.map((lesson) => (
                  <PracticeCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar: Practice History */}
        <aside className="xl:col-span-1">
          <div className="flex max-h-[calc(100vh-10rem)] flex-col space-y-5 overflow-hidden rounded-[1.5rem] border border-sol-border/20 bg-sol-surface/50 p-4 shadow-sm backdrop-blur-md md:rounded-[2rem] md:p-6 md:space-y-8 xl:sticky xl:top-24">
            <div className="flex items-center gap-3">
              <HistoryIcon size={18} className="text-sol-accent md:h-5 md:w-5" />
              <h3 className="text-base font-bold uppercase tracking-tight text-sol-text md:text-lg">{t("recentActivity")}</h3>
            </div>

            <div className="custom-scrollbar flex-grow space-y-3 overflow-y-auto pr-1 md:space-y-4 md:pr-2">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-sol-border/5 bg-sol-bg/20 p-4 text-center md:p-6">
                  <p className="text-xs text-sol-muted italic">{t("noHistory")}</p>
                </div>
              ) : (
                history.map((attempt) => (
                  <button 
                    key={attempt.id}
                    onClick={() => setSelectedAttemptId(attempt.id)}
                    className="group block w-full rounded-2xl border border-sol-border/10 bg-sol-surface p-3 text-left shadow-sm transition-all active:scale-95 hover:border-sol-accent/30 md:p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                       <span className="text-[9px] uppercase font-bold text-sol-muted bg-sol-bg px-2 py-1 rounded-md border border-sol-border/5">
                         {attempt.lesson?.grade?.title_en || "Practice"}
                       </span>
                       <span className="text-[9px] text-sol-muted whitespace-nowrap">
                         {format(new Date(attempt.completed_at), "MMM d, HH:mm")}
                       </span>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm font-bold text-sol-text transition-colors group-hover:text-sol-accent">
                      {locale === "vi" ? attempt.lesson?.title_vi : attempt.lesson?.title_en}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Award size={14} className="text-sol-accent" />
                        <span className="text-xs font-black text-sol-accent font-mono">{attempt.total_score}%</span>
                      </div>
                      <ArrowRight size={14} className="text-sol-muted group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Decorative Tips */}
            <div className="border-t border-sol-border/10 pt-4 md:pt-6">
              <div className="flex flex-col gap-2 rounded-xl border border-sol-accent/10 bg-sol-accent/5 p-3 md:p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Brain size={14} className="text-sol-accent" />
                  <h4 className="text-[10px] font-bold text-sol-accent uppercase tracking-wider">{t("tipTitle")}</h4>
                </div>
                <p className="text-[11px] text-sol-muted leading-relaxed">
                  {t("tipContent")}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Info */}
      <footer className="rounded-[2rem] border border-sol-accent/10 bg-sol-accent/5 p-6 text-center md:rounded-[2.5rem] md:p-12">
         <p className="text-sol-muted italic">
           {t("footerQuote")}
         </p>
      </footer>
    </div>
  );
}
