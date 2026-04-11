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
  const sidebarT = useTranslations("Sidebar");
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonGroups, setLessonGroups] = useState<any[]>([]);

  const fetchDisplayData = async () => {
    try {
      const lessons = await lessonService.list();
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
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-20">
      {/* Educational Hero Header */}
      <header className="relative p-10 md:p-20 rounded-[4rem] bg-sol-surface/30 border border-sol-border/10 overflow-hidden group">
        <div className="absolute -bottom-20 -right-20 p-20 opacity-5 group-hover:scale-105 transition-transform duration-1000 rotate-12 group-hover:rotate-0">
          <GraduationCap size={300} className="text-sol-accent" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-px bg-sol-accent/30"></span>
                <span className="text-sol-accent text-sm font-bold uppercase tracking-[0.3em]">
                  {commonT("adventure")}
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-sol-text tracking-tighter leading-[0.95]">
                {t("title")}
              </h1>
            </div>

            <Can I="manage" a="lesson">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-sol-accent text-sol-bg rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-sol-accent/20 cursor-pointer"
              >
                <PlusCircle size={20} />
                <span>New Lesson</span>
              </button>
            </Can>
          </div>

          <p className="text-xl md:text-2xl text-sol-muted leading-relaxed max-w-xl font-medium">
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sol-accent text-sol-bg font-bold shadow-lg shadow-sol-accent/20">
              <Globe size={18} />
              <span>{commonT("curriculumYear")}</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sol-surface border border-sol-border/10 text-sol-text font-bold">
              <Library size={18} className="text-sol-accent" />
              <span>{commonT("tracks", { count: 12 })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Grade Sections */}
      <div className="space-y-24">
        {lessonGroups.map((group) => (
          <section key={group.grade} className="space-y-10 group/section">
            <div className="flex items-end justify-between border-b border-sol-border/5 pb-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-sol-text tracking-tight uppercase group-hover/section:text-sol-accent transition-colors">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {group.lessons.map((lesson: any, idx: number) => {
                const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
                return (
                  <LearningCard
                    key={lesson.id}
                    lessonId={lesson.id}
                    gradeId={group.grade}
                    title={title}
                    index={idx + 1}
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
      <section className="bg-sol-surface/30 p-12 rounded-[3rem] border border-sol-border/5 text-center space-y-4">
        <h3 className="text-2xl font-bold text-sol-text">Ready for the next challenge?</h3>
        <p className="text-sol-muted max-w-lg mx-auto">
          Every lesson you complete brings you closer to mastering the curriculum. Your progress is synced across all devices.
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
