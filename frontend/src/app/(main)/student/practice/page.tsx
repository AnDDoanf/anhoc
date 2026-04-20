"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useMemo } from "react";
import { lessonService } from "@/services/lessonService";
import { testService } from "@/services/testService";
import PracticeCard from "@/components/feature/PracticeCard";
import PracticeResultModal from "@/components/feature/PracticeResultModal";
import Hero from "@/components/ui/Hero";
import FilterBar from "@/components/ui/FilterBar";
import { Sparkles, Trophy, BookOpen, Clock, Award, History as HistoryIcon, ArrowRight, Brain, Search } from "lucide-react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface AvailableLesson {
  id: string;
  title_en: string;
  title_vi: string;
  grade?: {
    id: string | number;
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

  // Filter States
  const [gradeIdFilter, setGradeIdFilter] = useState("all");
  const [lessonIdFilter, setLessonIdFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Derive Options
  const gradeOptions = useMemo(() => {
    return Array.from(
      new Map(
        availableLessons
          .filter((l: AvailableLesson) => l.grade)
          .map((l: AvailableLesson) => [
            String(l.grade!.id),
            { id: String(l.grade!.id), title: locale === "vi" ? l.grade!.title_vi : l.grade!.title_en }
          ])
      ).values()
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [availableLessons, locale]);

  const lessonOptions = useMemo(() => {
    return availableLessons
      .map((l: AvailableLesson) => ({
        id: l.id,
        title: locale === "vi" ? l.title_vi : l.title_en,
        gradeId: l.grade?.id ? String(l.grade.id) : "other"
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [availableLessons, locale]);

  const visibleLessonOptions = useMemo(() => {
    return lessonOptions.filter(
      (l) => gradeIdFilter === "all" || l.gradeId === gradeIdFilter
    );
  }, [lessonOptions, gradeIdFilter]);

  // Reset lesson filter if grade changes
  useEffect(() => {
    if (lessonIdFilter === "all") return;
    const currentLesson = lessonOptions.find(l => l.id === lessonIdFilter);
    if (gradeIdFilter !== "all" && currentLesson?.gradeId !== gradeIdFilter) {
      setLessonIdFilter("all");
    }
  }, [gradeIdFilter, lessonIdFilter, lessonOptions]);

  // Filter Logic
  const filteredLessons = useMemo(() => {
    return availableLessons.filter((lesson: AvailableLesson) => {
      if (gradeIdFilter !== "all" && String(lesson.grade?.id) !== gradeIdFilter) return false;
      if (lessonIdFilter !== "all" && String(lesson.id) !== lessonIdFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (locale === "vi" ? lesson.title_vi : lesson.title_en).toLowerCase();
        const gradeTitle = (locale === "vi" ? lesson.grade?.title_vi : lesson.grade?.title_en) ?? "";
        if (!title.includes(q) && !gradeTitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [availableLessons, gradeIdFilter, lessonIdFilter, searchQuery, locale]);

  // Group practice data by grade (using filtered results)
  const groupedData = useMemo(() => {
    return filteredLessons.reduce((acc: Record<string, { title?: string, lessons: AvailableLesson[] }>, curr: AvailableLesson) => {
      const gradeId = curr.grade?.id ? String(curr.grade.id) : "other";
      if (!acc[gradeId]) acc[gradeId] = {
        title: locale === "vi" ? curr.grade?.title_vi : curr.grade?.title_en,
        lessons: []
      };
      acc[gradeId].lessons.push(curr);
      return acc;
    }, {} as Record<string, { title?: string, lessons: AvailableLesson[] }>);
  }, [filteredLessons, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Clock className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  const dateLocale = locale === "vi" ? vi : enUS;

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PracticeResultModal
        isOpen={!!selectedAttemptId}
        onClose={() => setSelectedAttemptId(null)}
        attemptId={selectedAttemptId}
      />

      {/* Hero Header */}
      <Hero 
        icon={<Trophy size={120} className="text-sol-accent md:h-48 md:w-48 animate-pulse" />}
        className="md:rounded-[3rem] overflow-hidden border-b border-sol-accent/5"
        containerClassName="relative z-10 flex w-full flex-col items-center gap-8 lg:flex-row lg:justify-between"
      >
        <div className="space-y-4 md:space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-sol-accent/30 bg-sol-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-sol-accent">
            <Sparkles size={14} className="animate-spin-slow" />
            <span>{t("hubBadge")}</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black leading-[0.95] tracking-tighter text-sol-text max-w-[15ch] lg:max-w-none">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-sol-muted md:text-xl font-medium">
            {t("subtitle")}
          </p>
        </div>
      </Hero>

      {/* Filters */}
      <FilterBar gridClassName="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Grade Filter */}
        <div className="space-y-2 md:col-span-3">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted px-1">
            {t("filters.grade")}
          </label>
          <select
            value={gradeIdFilter}
            onChange={(e) => setGradeIdFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-bold text-sol-text transition-all focus:ring-4 focus:ring-sol-accent/5 focus:border-sol-accent/30 md:px-6 md:py-4 md:text-base cursor-pointer"
          >
            <option value="all">{t("filters.allGrades")}</option>
            {gradeOptions.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.title}
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Filter */}
        <div className="space-y-2 md:col-span-4">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted px-1">
            {t("filters.lesson")}
          </label>
          <select
            value={lessonIdFilter}
            onChange={(e) => setLessonIdFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-bold text-sol-text transition-all focus:ring-4 focus:ring-sol-accent/5 focus:border-sol-accent/30 md:px-6 md:py-4 md:text-base cursor-pointer"
          >
            <option value="all">{t("filters.allLessons")}</option>
            {visibleLessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="space-y-2 md:col-span-5">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted px-1">
            {t("filters.search")}
          </label>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted md:left-5"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg py-3 pl-11 pr-4 text-sm font-bold text-sol-text transition-all focus:ring-4 focus:ring-sol-accent/5 focus:border-sol-accent/30 md:px-6 md:py-4 md:pl-14 md:text-base"
            />
          </div>
        </div>
      </FilterBar>

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
        <aside className="xl:sticky xl:top-24 xl:col-span-1 xl:self-start">
          <div className="flex max-h-[calc(100vh-10rem)] flex-col space-y-5 overflow-hidden rounded-[1.5rem] border border-sol-border/20 bg-sol-surface/50 p-4 shadow-sm backdrop-blur-md md:rounded-[2rem] md:p-6 md:space-y-8">
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
                        {(locale === "vi" ? attempt.lesson?.grade?.title_vi : attempt.lesson?.grade?.title_en) || "Practice"}
                      </span>
                      <span className="text-[9px] text-sol-muted whitespace-nowrap">
                        {format(new Date(attempt.completed_at), locale === "vi" ? "d MMM, HH:mm" : "MMM d, HH:mm", { locale: dateLocale })}
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
