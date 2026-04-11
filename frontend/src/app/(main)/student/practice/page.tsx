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
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      <PracticeResultModal 
        isOpen={!!selectedAttemptId} 
        onClose={() => setSelectedAttemptId(null)} 
        attemptId={selectedAttemptId} 
      />
      
      {/* Hero Header */}
      <header className="relative p-10 md:p-16 rounded-[3rem] bg-sol-surface/30 border border-sol-border/10 overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <Trophy size={160} className="text-sol-accent" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles size={14} />
            <span>{t("hubBadge")}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-sol-text tracking-tight mb-6 leading-tight">
            {t("title")}
          </h1>
          <p className="text-lg md:text-xl text-sol-muted leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 items-start">
        
        {/* Available Practices List (3/4 on large screens) */}
        <div className="xl:col-span-3 space-y-20">
          {Object.entries(groupedData).map(([gradeId, group]) => (
            <section key={gradeId} className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sol-surface/50 border border-sol-border/10 flex items-center justify-center text-sol-accent shadow-sm">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-sol-text tracking-tight uppercase">
                    {group.title || gradeId}
                  </h2>
                  <div className="h-1 w-12 bg-sol-accent rounded-full mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {group.lessons.map((lesson) => (
                  <PracticeCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar: Practice History */}
        <aside className="xl:col-span-1">
          <div className="sticky top-24 p-6 rounded-[2rem] border border-sol-border/20 bg-sol-surface/50 backdrop-blur-md shadow-sm space-y-8 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
            <div className="flex items-center gap-3">
              <HistoryIcon size={20} className="text-sol-accent" />
              <h3 className="text-lg font-bold text-sol-text uppercase tracking-tight">{t("recentActivity")}</h3>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
              {history.length === 0 ? (
                <div className="p-6 rounded-2xl bg-sol-bg/20 border border-sol-border/5 text-center">
                  <p className="text-xs text-sol-muted italic">{t("noHistory")}</p>
                </div>
              ) : (
                history.map((attempt) => (
                  <button 
                    key={attempt.id}
                    onClick={() => setSelectedAttemptId(attempt.id)}
                    className="w-full text-left block group p-4 rounded-2xl bg-sol-surface border border-sol-border/10 hover:border-sol-accent/30 transition-all shadow-sm active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-2">
                       <span className="text-[9px] uppercase font-bold text-sol-muted bg-sol-bg px-2 py-1 rounded-md border border-sol-border/5">
                         {attempt.lesson?.grade?.title_en || "Practice"}
                       </span>
                       <span className="text-[9px] text-sol-muted whitespace-nowrap">
                         {format(new Date(attempt.completed_at), "MMM d, HH:mm")}
                       </span>
                    </div>
                    <p className="text-sm font-bold text-sol-text mb-2 line-clamp-1 group-hover:text-sol-accent transition-colors">
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
            <div className="pt-6 border-t border-sol-border/10">
              <div className="p-4 rounded-xl flex flex-col gap-2 bg-sol-accent/5 border border-sol-accent/10">
                <div className="flex items-center gap-2 mb-1">
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
      <footer className="p-12 rounded-[2.5rem] bg-sol-accent/5 border border-sol-accent/10 text-center">
         <p className="text-sol-muted italic">
           {t("footerQuote")}
         </p>
      </footer>
    </div>
  );
}
