"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import LearningCard from "@/components/feature/LearningCard";
import Can from "@/components/auth/Can";
import { GraduationCap, Library, Globe, ArrowUpRight, PlusCircle } from "lucide-react";
import CreateLessonModal from "@/components/feature/CreateLessonModal";
import { useState, useEffect } from "react";
import { lessonService } from "@/services/lessonService";

export default function LearningDashboard() {
  const t = useTranslations("Learning");
  const commonT = useTranslations("Common");
  const sidebar = useTranslations("Sidebar");
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonGroups, setLessonGroups] = useState<any[]>([]);
  const [masteryData, setMasteryData] = useState<Record<string, any>>({});

  const fetchDisplayData = async () => {
    try {
      const [lessons, mastery] = await Promise.all([
        lessonService.list(),
        lessonService.getMasteryAll()
      ]);

      // Map mastery by lesson_id for easy lookup
      const masteryMap = mastery.reduce((acc: any, m: any) => {
        acc[m.lesson_id] = m;
        return acc;
      }, {});
      setMasteryData(masteryMap);

      const groups = lessons.reduce((acc: any, lesson: any) => {
        const gradeSlug = lesson.grade?.slug || "other";
        const gradeLabel = locale === "vi" ? lesson.grade?.title_vi : lesson.grade?.title_en;
        if (!acc[gradeSlug]) {
          acc[gradeSlug] = { grade: gradeSlug, label: gradeLabel || gradeSlug, lessons: [] };
        }
        acc[gradeSlug].lessons.push(lesson);
        return acc;
      }, {});
      setLessonGroups(Object.values(groups));
    } catch (err) {
      console.error("Failed to load dashboard lessons:", err);
    }
  };

  useEffect(() => {
    fetchDisplayData();
  }, [locale]);

  const handleCreateSuccess = () => {
    fetchDisplayData();
  };

  const handleEdit = (id: string) => {
    setEditLessonId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      try {
        await lessonService.remove(id);
        fetchDisplayData();
      } catch (err) {
        console.error("Failed to delete lesson");
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditLessonId(null), 300); // clear after animation
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 py-4 md:space-y-20 md:py-10">
      {/* Educational Hero Header */}
      <header className="group relative overflow-hidden rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-5 sm:p-6 md:rounded-[4rem] md:p-20">
        <div className="absolute -bottom-10 -right-8 p-8 opacity-5 rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-105 md:-bottom-20 md:-right-20 md:p-20">
          <GraduationCap size={160} className="text-sol-accent md:h-[300px] md:w-[300px]" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4 md:space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="h-px w-8 bg-sol-accent/30 md:w-12"></span>
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-sol-accent sm:text-xs md:text-sm md:tracking-[0.3em]">
                  {commonT("adventure")}
                </span>
              </div>

              <h1 className="max-w-[11ch] text-[1.9rem] font-black leading-[1] tracking-tighter text-sol-text sm:text-5xl md:max-w-none md:text-7xl">
                {t("title")}
              </h1>
            </div>

            <Can I="manage" a="lesson">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3"
              >
                <PlusCircle size={18} className="md:h-5 md:w-5" />
                <span>{t("newLesson")}</span>
              </button>
            </Can>
          </div>

          <p className="max-w-xl text-[13px] font-medium leading-relaxed text-sol-muted sm:text-base md:text-2xl">
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap gap-3 pt-2 md:gap-4 md:pt-4">
            <div className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 md:px-5 md:py-2.5">
              <Globe size={16} className="md:h-[18px] md:w-[18px]" />
              <span>{commonT("curriculumYear")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-sol-border/10 bg-sol-surface px-4 py-2 text-sm font-bold text-sol-text md:px-5 md:py-2.5">
              <Library size={16} className="text-sol-accent md:h-[18px] md:w-[18px]" />
              <span>{commonT("tracks", { count: 12 })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Grade Sections */}
      <div className="space-y-12 md:space-y-24">
        {lessonGroups.map((group) => (
          <section key={group.grade} className="group/section space-y-6 md:space-y-10">
            <div className="flex flex-col gap-3 border-b border-sol-border/5 pb-4 sm:flex-row sm:items-end sm:justify-between md:pb-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-sol-text transition-colors group-hover/section:text-sol-accent md:text-3xl">
                  {group.label}
                </h2>
                <p className="text-sol-muted text-sm font-medium">
                  {t("lessonCount", { count: group.lessons.length })}
                </p>
              </div>
              <Link
                href={`/student/learning/${group.grade}`}
                prefetch={false}
                className="flex items-center gap-2 text-sol-accent font-bold text-sm hover:underline hover:opacity-80 transition-all group/link"
              >
                {t("viewPath")} <ArrowUpRight size={16} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-10">
              {group.lessons.map((lesson: any, idx: number) => {
                const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
                return (
                  <LearningCard
                    key={lesson.id}
                    lessonId={lesson.id}
                    gradeId={group.grade}
                    title={title}
                    index={idx + 1}
                    mastery={masteryData[lesson.id]}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Progress Footer */}
      <section className="space-y-3 rounded-[2rem] border border-sol-border/5 bg-sol-surface/30 p-6 text-center md:space-y-4 md:rounded-[3rem] md:p-12">
        <h3 className="text-xl font-bold text-sol-text md:text-2xl">{t("readyChallengeTitle")}</h3>
        <p className="text-sol-muted max-w-lg mx-auto">
          {t("readyChallengeSubtitle")}
        </p>
      </section>

      <CreateLessonModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleCreateSuccess}
        editLessonId={editLessonId}
      />
    </div>
  );
}
