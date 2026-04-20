"use client";

import { useTranslations, useLocale } from "next-intl";
import TestCard from "@/components/feature/TestCard";
import Hero from "@/components/ui/Hero";
import FilterBar from "@/components/ui/FilterBar";
import { Medal, BookOpen, Sparkles, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { testService } from "@/services/testService";
import { lessonService } from "@/services/lessonService";

type GradeTest = {
  id: string;
  grade_id: number;
  grade_slug: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  questionCount: number;
  availableTemplateCount: number;
  lessonCount: number;
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
  grade?: {
    id: number;
    slug: string;
    title_en: string;
    title_vi: string;
    lessons?: {
      id: string;
      slug: string;
      title_en: string;
      title_vi: string;
    }[];
  };
};

export default function TestPage() {
  const t = useTranslations("Test");
  const locale = useLocale();
  const [tests, setTests] = useState<GradeTest[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [gradeIdFilter, setGradeIdFilter] = useState("all");
  const [lessonIdFilter, setLessonIdFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [testData, lessonData] = await Promise.all([
          testService.listGradeTests(),
          lessonService.getAvailablePractices() // Good for getting all lessons
        ]);
        setTests(testData);
        setLessons(lessonData);
      } catch (error) {
        console.error("Failed to load test page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Options
  const gradeOptions = useMemo(() => {
    return Array.from(
      new Map(
        tests.filter(t => t.grade).map(t => [
          String(t.grade!.id),
          { id: String(t.grade!.id), title: locale === "vi" ? t.grade!.title_vi : t.grade!.title_en }
        ])
      ).values()
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [tests, locale]);

  const lessonOptions = useMemo(() => {
    return lessons.map(l => ({
      id: l.id,
      title: locale === "vi" ? l.title_vi : l.title_en,
      gradeId: String(l.grade?.id || "")
    })).sort((a, b) => a.title.localeCompare(b.title));
  }, [lessons, locale]);

  const visibleLessonOptions = useMemo(() => {
    return lessonOptions.filter(l => gradeIdFilter === "all" || l.gradeId === gradeIdFilter);
  }, [lessonOptions, gradeIdFilter]);

  // Reset lesson if grade changes
  useEffect(() => {
    if (lessonIdFilter === "all") return;
    const currentLesson = lessonOptions.find(l => l.id === lessonIdFilter);
    if (gradeIdFilter !== "all" && currentLesson?.gradeId !== gradeIdFilter) {
      setLessonIdFilter("all");
    }
  }, [gradeIdFilter, lessonIdFilter, lessonOptions]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const gradeIdStr = String(test.grade_id);
      
      // Grade filter
      if (gradeIdFilter !== "all" && gradeIdStr !== gradeIdFilter) return false;
      
      // Lesson filter - if a lesson is selected, only show the grade test that contains this lesson
      if (lessonIdFilter !== "all") {
        const hasLesson = test.grade?.lessons?.some((l: any) => l.id === lessonIdFilter);
        if (!hasLesson) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const gradeTitle = (locale === "vi" ? test.grade?.title_vi : test.grade?.title_en) ?? "";
        const testTitle = (locale === "vi" ? test.title_vi : test.title_en).toLowerCase();
        // Also search in lessons of this grade test
        const lessonMatch = test.grade?.lessons?.some((l: any) => {
          const lTitle = (locale === "vi" ? l.title_vi : l.title_en).toLowerCase();
          return lTitle.includes(q);
        });
        
        if (!gradeTitle.toLowerCase().includes(q) && !testTitle.includes(q) && !lessonMatch) return false;
      }
      
      return true;
    });
  }, [tests, gradeIdFilter, lessonIdFilter, searchQuery, locale]);

  const groupedData = useMemo(() => filteredTests.reduce((acc, curr) => {
    const gradeKey = curr.grade_slug || String(curr.grade_id);
    if (!acc[gradeKey]) acc[gradeKey] = [];
    acc[gradeKey].push(curr);
    return acc;
  }, {} as Record<string, GradeTest[]>), [filteredTests]);

  const getGradeTitle = (items: GradeTest[], gradeId: string) => {
    const grade = items[0]?.grade;
    if (!grade) return gradeId;
    return locale === "vi" ? grade.title_vi : grade.title_en;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Hero 
        icon={<Medal size={120} className="text-sol-accent md:h-48 md:w-48 animate-bounce-slow" />}
        className="md:rounded-[3rem] overflow-hidden border-b border-sol-accent/5"
        containerClassName="relative z-10 flex w-full flex-col items-center gap-8 lg:flex-row lg:justify-between"
      >
        <div className="space-y-4 md:space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-sol-accent/30 bg-sol-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-sol-accent">
            <Sparkles size={14} className="animate-pulse" />
            <span>{t("challengeBadge")}</span>
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

      <div className="space-y-10 md:space-y-20">
        {Object.entries(groupedData).map(([gradeId, gradeTests]) => (
          <section key={gradeId} className="space-y-5 md:space-y-8">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sol-border/10 bg-sol-surface/50 text-sol-accent shadow-sm md:h-12 md:w-12 md:rounded-2xl">
                <BookOpen size={20} className="md:h-6 md:w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-sol-text md:text-2xl">
                  {getGradeTitle(gradeTests, gradeId)}
                </h2>
                <div className="h-1 w-12 bg-sol-accent rounded-full mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
              {gradeTests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          </section>
        ))}

        {tests.length === 0 && (
          <div className="rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-10 text-center">
            <h2 className="text-xl font-black text-sol-text">{t("emptyTitle")}</h2>
            <p className="mt-2 font-bold text-sol-muted">{t("emptySubtitle")}</p>
          </div>
        )}
      </div>

      <footer className="footer-gradient rounded-[2rem] border border-sol-border/10 bg-sol-accent/5 p-6 text-center md:rounded-[2.5rem] md:p-12">
        <p className="text-sol-muted italic">
          {t("footerQuote")}
        </p>
      </footer>
    </div>
  );
}
