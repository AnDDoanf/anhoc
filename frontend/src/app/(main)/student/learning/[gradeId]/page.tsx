"use client";

import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Milestone from "@/components/feature/Milestone";
import { Trophy, ArrowLeft, Layers, Target, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { lessonService } from "@/services/lessonService";

export default function GradePathPage() {
  const params = useParams();
  const gradeId = params.gradeId as string;

  const t = useTranslations("Path");
  const commonT = useTranslations("Common");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [gradeGroup, setGradeGroup] = useState<any>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const lessons = await lessonService.list();
        const currentGradeLessons = lessons.filter((l: any) => l.grade?.slug === gradeId);

        if (currentGradeLessons.length > 0) {
          const firstLesson = currentGradeLessons[0];
          const gradeLabel = locale === "vi" ? firstLesson.grade?.title_vi : firstLesson.grade?.title_en;
          setGradeGroup({
            grade: gradeId,
            label: gradeLabel || gradeId,
            lessons: currentGradeLessons,
          });
        } else {
          setGradeGroup(null);
        }
      } catch (error) {
        console.error("Failed to load grade path:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [gradeId, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  if (!gradeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h1 className="text-4xl font-black text-sol-text">{commonT("error.gradeNotFound")}</h1>
        <Link
          href="/student/learning"
          prefetch={false}
          className="text-sol-accent hover:underline">{commonT("backToHub")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-0 py-6 md:py-12 space-y-10 md:space-y-16">

      {/* Header & Back Link */}
      <div className="space-y-8">
        <Link
          href="/student/learning"
          prefetch={false}
          className="inline-flex items-center gap-2 text-sol-muted hover:text-sol-accent transition-colors font-bold text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>{commonT("backToHub")}</span>
        </Link>

        <header className="relative p-5 sm:p-8 md:p-16 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] bg-sol-surface border border-sol-border/30 shadow-xl sm:shadow-2xl overflow-hidden group">
          {/* Premium Pulsing Gradient Glows aligned with student/games */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/15 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

          <div className="absolute top-0 right-0 p-4 sm:p-8 md:p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-6 pointer-events-none">
            <Trophy size={140} className="text-sol-accent w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sol-accent/10 flex items-center justify-center text-sol-accent shadow-sm">
                <Target size={20} />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-sol-text tracking-tight">
                {gradeGroup.label} : {t("title")}
              </h1>
            </div>
            <p className="text-lg text-sol-muted max-w-xl">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex gap-6 mt-8 relative z-10 border-t border-sol-border/20 pt-8">
            <div className="flex items-center gap-2 text-xs font-bold text-sol-muted uppercase tracking-widest">
              <Layers size={14} className="text-sol-accent" />
              <span>{t("modules", { count: gradeGroup.lessons.length })}</span>
            </div>
          </div>
        </header>
      </div>

      {/* The Roadmap Path */}
      <div className="relative pb-32">
        {gradeGroup.lessons.map((lesson: any, idx: number) => {
          const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
          return (
            <Milestone
              key={lesson.id}
              lessonId={lesson.id}
              gradeId={gradeId}
              title={title}
              index={idx + 1}
              isEven={idx % 2 === 0}
              isLast={idx === gradeGroup.lessons.length - 1}
            />
          );
        })}

        {/* Final Goal Node */}
        <div className="flex flex-col items-center justify-center pt-24 space-y-8 animate-in zoom-in duration-1000 delay-500">
          <div className="w-24 h-24 rounded-full bg-sol-accent text-sol-bg flex items-center justify-center shadow-[0_0_50px_rgba(var(--sol-accent-rgb),0.5)]">
            <Trophy size={48} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-sol-text uppercase tracking-widest">{t("completionTitle")}</h3>
            <p className="text-sol-muted">{t("completionSub")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
