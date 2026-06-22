"use client";

import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Milestone from "@/components/feature/Milestone";
import { Trophy, ArrowLeft, Layers, Target, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LessonMastery, lessonService } from "@/services/lessonService";
import GradeTestEntry from "@/components/feature/GradeTestEntry";
import { GradeTest, testService } from "@/services/testService";

export default function GradePathPage() {
  const params = useParams();
  const gradeId = params.gradeId as string;

  const t = useTranslations("Path");
  const commonT = useTranslations("Common");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [gradeGroup, setGradeGroup] = useState<any>(null);
  const [gradeTest, setGradeTest] = useState<GradeTest | null>(null);
  const [masteryByLessonId, setMasteryByLessonId] = useState<Record<string, LessonMastery>>({});

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const [lessons, mastery, tests] = await Promise.all([
          lessonService.list(),
          lessonService.getMasteryAll().catch((error) => {
            console.error("Failed to load lesson mastery:", error);
            return [] as LessonMastery[];
          }),
          testService.listGradeTests().catch((error) => {
            console.error("Failed to load grade tests:", error);
            return [] as GradeTest[];
          }),
        ]);
        const masteryMap = mastery.reduce<Record<string, LessonMastery>>((acc, item) => {
          acc[item.lesson_id] = item;
          return acc;
        }, {});
        setMasteryByLessonId(masteryMap);
        const currentGradeLessons = lessons.filter((l: any) => l.grade?.slug === gradeId);

        if (currentGradeLessons.length > 0) {
          const firstLesson = currentGradeLessons[0];
          const gradeLabel = locale === "vi" ? firstLesson.grade?.title_vi : firstLesson.grade?.title_en;
          setGradeGroup({
            grade: gradeId,
            label: gradeLabel || gradeId,
            lessons: currentGradeLessons,
          });
          const matchedTest = tests.find((test) => (
            test.grade_slug === gradeId || test.grade?.slug === gradeId
          )) || null;
          setGradeTest(matchedTest);
        } else {
          setGradeGroup(null);
          setGradeTest(null);
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
    <div className="mx-auto max-w-7xl px-0 py-4 space-y-8 md:space-y-16 md:py-12">

      {/* Header & Back Link */}
      <div className="space-y-5 md:space-y-8">
        <Link
          href="/student/learning"
          prefetch={false}
          className="inline-flex items-center gap-2 text-sol-muted hover:text-sol-accent transition-colors font-bold text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>{commonT("backToHub")}</span>
        </Link>

        <header className="group relative overflow-hidden rounded-[2rem] bg-sol-surface border border-sol-border/30 p-4 shadow-xl sm:rounded-[2.5rem] sm:p-8 sm:shadow-2xl md:rounded-[3rem] md:p-16">
          {/* Premium Pulsing Gradient Glows aligned with student/games */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/15 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transition-transform duration-1000 rotate-6 group-hover:scale-110 sm:p-8 md:p-12">
            <Trophy size={140} className="h-20 w-20 text-sol-accent sm:h-32 sm:w-32 md:h-36 md:w-36" />
          </div>

          <div className="relative z-10 space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sol-accent/10 text-sol-accent shadow-sm">
                <Target size={20} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-sol-text sm:text-3xl md:text-5xl">
                {gradeGroup.label} : {t("title")}
              </h1>
            </div>
            <p className="max-w-xl text-sm text-sol-muted sm:text-base md:text-lg">
              {t("subtitle")}
            </p>
          </div>

          <div className="relative z-10 mt-5 flex gap-4 border-t border-sol-border/20 pt-5 sm:mt-8 sm:gap-6 sm:pt-8">
            <div className="flex items-center gap-2 text-xs font-bold text-sol-muted uppercase tracking-widest">
              <Layers size={14} className="text-sol-accent" />
              <span>{t("modules", { count: gradeGroup.lessons.length })}</span>
            </div>
          </div>
        </header>

        {gradeTest && <GradeTestEntry test={gradeTest} />}
      </div>

      {/* The Roadmap Path */}
      <div className="relative pb-20 sm:pb-24 md:pb-32">
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
              mastery={masteryByLessonId[lesson.id]}
            />
          );
        })}

        {/* Final Goal Node */}
        <div className="flex flex-col items-center justify-center space-y-5 pt-16 animate-in zoom-in duration-1000 delay-500 sm:space-y-8 sm:pt-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sol-accent text-sol-bg shadow-[0_0_50px_rgba(var(--sol-accent-rgb),0.5)] sm:h-24 sm:w-24">
            <Trophy size={48} />
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-black uppercase tracking-[0.18em] text-sol-text sm:text-2xl sm:tracking-widest">{t("completionTitle")}</h3>
            <p className="text-sm text-sol-muted sm:text-base">{t("completionSub")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
