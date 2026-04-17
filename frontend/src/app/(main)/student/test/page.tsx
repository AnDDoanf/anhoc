"use client";

import { useTranslations, useLocale } from "next-intl";
import TestCard from "@/components/feature/TestCard";
import { Medal, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { testService } from "@/services/testService";

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
  };
};

export default function TestPage() {
  const t = useTranslations("Test");
  const locale = useLocale();
  const [tests, setTests] = useState<GradeTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        const data = await testService.listGradeTests();
        setTests(data);
      } catch (error) {
        console.error("Failed to load grade tests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const groupedData = useMemo(() => tests.reduce((acc, curr) => {
    const gradeKey = curr.grade_slug || String(curr.grade_id);
    if (!acc[gradeKey]) acc[gradeKey] = [];
    acc[gradeKey].push(curr);
    return acc;
  }, {} as Record<string, GradeTest[]>), [tests]);

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
    <div className="mx-auto max-w-7xl space-y-8 py-4 md:space-y-16 md:py-10">
      <header className="group relative overflow-hidden rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-5 sm:p-6 md:rounded-[3rem] md:p-16">
        <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform duration-1000 group-hover:scale-110 sm:p-6 md:p-10">
          <Medal size={112} className="text-sol-accent md:h-40 md:w-40" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3 md:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
            <Sparkles size={11} className="md:h-3.5 md:w-3.5" />
            <span>{t("examinationHub")}</span>
          </div>
          <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
            {t("subtitle")}
          </p>
        </div>
      </header>

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
