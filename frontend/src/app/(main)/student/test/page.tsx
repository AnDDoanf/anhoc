"use client";

import { useTranslations, useLocale } from "next-intl";
import { testData, LessonTest } from "@/mockData/testData";
import TestCard from "@/components/feature/TestCard";
import { Medal, BookOpen, Sparkles } from "lucide-react";

export default function TestPage() {
  const t = useTranslations("Test");
  const locale = useLocale();

  // Group test data by grade
  const groupedData = testData.reduce((acc, curr) => {
    if (!acc[curr.gradeId]) acc[curr.gradeId] = [];
    acc[curr.gradeId].push(curr);
    return acc;
  }, {} as Record<string, LessonTest[]>);

  // Helper to format grade title
  const getGradeTitle = (gradeId: string) => {
    const gradeMap: Record<string, string> = {
      "grade-1": locale === "vi" ? "Lớp 1" : "Grade 1",
      "grade-6": locale === "vi" ? "Lớp 6" : "Grade 6",
    };
    return gradeMap[gradeId] || gradeId;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-4 md:space-y-16 md:py-10">
      
      {/* Hero Header */}
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

      {/* Grade Sections */}
      <div className="space-y-10 md:space-y-20">
        {Object.entries(groupedData).map(([gradeId, tests]) => (
          <section key={gradeId} className="space-y-5 md:space-y-8">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sol-border/10 bg-sol-surface/50 text-sol-accent shadow-sm md:h-12 md:w-12 md:rounded-2xl">
                <BookOpen size={20} className="md:h-6 md:w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-sol-text md:text-2xl">
                  {getGradeTitle(gradeId)}
                </h2>
                <div className="h-1 w-12 bg-sol-accent rounded-full mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
              {tests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer Info */}
      <footer className="footer-gradient rounded-[2rem] border border-sol-border/10 bg-sol-accent/5 p-6 text-center md:rounded-[2.5rem] md:p-12">
         <p className="text-sol-muted italic">
           "Knowledge is power. Test your limits!"
         </p>
      </footer>
    </div>
  );
}
