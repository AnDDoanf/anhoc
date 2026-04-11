"use client";

import { useTranslations, useLocale } from "next-intl";
import { practiceData, LessonPractice } from "@/mockData/practiceData";
import PracticeCard from "@/components/feature/PracticeCard";
import { Sparkles, Trophy, BookOpen } from "lucide-react";

export default function PracticePage() {
  const t = useTranslations("Practice");
  const locale = useLocale();

  // Group practice data by grade
  const groupedData = practiceData.reduce((acc, curr) => {
    if (!acc[curr.gradeId]) acc[curr.gradeId] = [];
    acc[curr.gradeId].push(curr);
    return acc;
  }, {} as Record<string, LessonPractice[]>);

  // Helper to format grade title (Mocking the translation for now or using Sidebar logic)
  const getGradeTitle = (gradeId: string) => {
    const gradeMap: Record<string, string> = {
      "grade-1": locale === "vi" ? "Lớp 1" : "Grade 1",
      "grade-6": locale === "vi" ? "Lớp 6" : "Grade 6",
    };
    return gradeMap[gradeId] || gradeId;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      
      {/* Hero Header */}
      <header className="relative p-10 md:p-16 rounded-[3rem] bg-sol-surface/30 border border-sol-border/10 overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <Trophy size={160} className="text-sol-accent" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles size={14} />
            <span>Learning Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-sol-text tracking-tight mb-6 leading-tight">
            {t("title")}
          </h1>
          <p className="text-lg md:text-xl text-sol-muted leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </header>

      {/* Grade Sections */}
      <div className="space-y-20">
        {Object.entries(groupedData).map(([gradeId, lessons]) => (
          <section key={gradeId} className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sol-surface/50 border border-sol-border/10 flex items-center justify-center text-sol-accent shadow-sm">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-sol-text tracking-tight uppercase">
                  {getGradeTitle(gradeId)}
                </h2>
                <div className="h-1 w-12 bg-sol-accent rounded-full mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {lessons.map((practice) => (
                <PracticeCard key={practice.id} practice={practice} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer Info */}
      <footer className="footer-gradient p-12 rounded-[2.5rem] bg-sol-accent/5 border border-sol-accent/10 text-center">
         <p className="text-sol-muted italic">
           "Practice makes perfect. Keep pushing forward!"
         </p>
      </footer>
    </div>
  );
}
