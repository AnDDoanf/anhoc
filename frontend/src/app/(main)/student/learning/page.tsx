"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import LearningCard from "@/components/feature/LearningCard";
import Can from "@/components/auth/Can";
import { GraduationCap, Library, Globe, ArrowUpRight, PlusCircle, Layers, BookMarked, ChevronRight } from "lucide-react";
import CreateLessonModal from "@/components/feature/CreateLessonModal";
import Hero from "@/components/ui/Hero";
import { useState, useEffect, useCallback } from "react";
import { Lesson, LessonMastery, Subject, lessonService } from "@/services/lessonService";
import { isAxiosError } from "axios";

type LessonGradeGroup = {
  grade: string;
  label: string;
  lessons: Lesson[];
};

type LessonSubjectGroup = {
  subject: string;
  label: string;
  grades: LessonGradeGroup[];
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error || error.response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

export default function LearningDashboard() {
  const t = useTranslations("Learning");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metaModal, setMetaModal] = useState<"subject" | "grade" | null>(null);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonGroups, setLessonGroups] = useState<LessonSubjectGroup[]>([]);
  const [masteryData, setMasteryData] = useState<Record<string, LessonMastery>>({});
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

  const fetchDisplayData = useCallback(async () => {
    try {
      const [lessons, mastery] = await Promise.all([
        lessonService.list(),
        lessonService.getMasteryAll()
      ]);

      // Map mastery by lesson_id for easy lookup
      const masteryMap = mastery.reduce<Record<string, LessonMastery>>((acc, item) => {
        acc[item.lesson_id] = item;
        return acc;
      }, {});
      setMasteryData(masteryMap);

      const groups = lessons.reduce<Record<string, Omit<LessonSubjectGroup, "grades"> & { grades: Record<string, LessonGradeGroup> }>>((acc, lesson) => {
        const subjectId = lesson.subject?.id || "other";
        const subjectKey = String(subjectId);
        const subjectLabel = locale === "vi" ? lesson.subject?.title_vi : lesson.subject?.title_en;
        const gradeSlug = lesson.grade?.slug || "other";
        const gradeLabel = locale === "vi" ? lesson.grade?.title_vi : lesson.grade?.title_en;
        if (!acc[subjectKey]) {
          acc[subjectKey] = {
            subject: subjectKey,
            label: subjectLabel || lesson.subject?.slug || "Other",
            grades: {},
          };
        }
        if (!acc[subjectKey].grades[gradeSlug]) {
          acc[subjectKey].grades[gradeSlug] = { grade: gradeSlug, label: gradeLabel || gradeSlug, lessons: [] };
        }
        acc[subjectKey].grades[gradeSlug].lessons.push(lesson);
        return acc;
      }, {});
      setLessonGroups(
        Object.values(groups).map((subject) => ({
          ...subject,
          grades: Object.values(subject.grades).sort((a, b) => a.label.localeCompare(b.label)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
      );
    } catch (err) {
      console.error("Failed to load dashboard lessons:", err);
    }
  }, [locale]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDisplayData();
  }, [fetchDisplayData]);

  const handleCreateSuccess = () => {
    fetchDisplayData();
    window.dispatchEvent(new Event("lesson-meta-updated"));
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
        console.error("Failed to delete lesson", err);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditLessonId(null), 300); // clear after animation
  };

  const getGradeKey = (subject: string, grade: string) => `${subject}:${grade}`;

  const toggleGrade = (subject: string, grade: string) => {
    const gradeKey = getGradeKey(subject, grade);
    setExpandedGrades((current) => ({ ...current, [gradeKey]: !current[gradeKey] }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Educational Hero Header */}
      <Hero
        iconPosition="bottom-right"
        icon={<GraduationCap size={160} className="text-sol-accent md:h-[300px] md:w-[300px]" />}
        className="md:rounded-[3rem]"
        containerClassName="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between"
      >
        <div className="space-y-5 md:space-y-8">
          <div className="space-y-3 md:space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
              <GraduationCap size={11} className="md:h-3.5 md:w-3.5" />
              <span>{commonT("adventure")}</span>
            </div>

            <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
              {t("title")}
            </h1>
            
            <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
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

        <Can I="manage" a="lesson">
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setMetaModal("subject")}
              className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface px-4 py-2.5 text-sm font-bold text-sol-text transition-transform hover:scale-105 hover:text-sol-accent cursor-pointer md:px-5 md:py-3"
            >
              <BookMarked size={18} className="md:h-5 md:w-5" />
              <span>{t("newSubject")}</span>
            </button>
            <button
              onClick={() => setMetaModal("grade")}
              className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface px-4 py-2.5 text-sm font-bold text-sol-text transition-transform hover:scale-105 hover:text-sol-accent cursor-pointer md:px-5 md:py-3"
            >
              <Layers size={18} className="md:h-5 md:w-5" />
              <span>{t("newGrade")}</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3"
            >
              <PlusCircle size={18} className="md:h-5 md:w-5" />
              <span>{t("newLesson")}</span>
            </button>
          </div>
        </Can>
      </Hero>

      {/* Subject + Grade Sections */}
      <div className="space-y-12 md:space-y-24">
        {lessonGroups.map((subject) => (
          <section key={subject.subject} className="group/section space-y-8 md:space-y-12">
            <div className="flex flex-col gap-3 border-b border-sol-border/5 pb-4 sm:flex-row sm:items-end sm:justify-between md:pb-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-sol-text transition-colors group-hover/section:text-sol-accent md:text-3xl">
                  {subject.label}
                </h2>
                <p className="text-sol-muted text-sm font-medium">
                  {t("tracks", { count: subject.grades.length })}
                </p>
              </div>
            </div>

            {subject.grades.map((group) => (
              <div key={`${subject.subject}-${group.grade}`} className="space-y-5">
                <button
                  type="button"
                  onClick={() => toggleGrade(subject.subject, group.grade)}
                  aria-expanded={Boolean(expandedGrades[getGradeKey(subject.subject, group.grade)])}
                  className="flex w-full flex-col gap-3 rounded-3xl border border-sol-border/10 bg-sol-surface/30 p-5 text-left transition-all hover:border-sol-accent/30 hover:bg-sol-surface sm:flex-row sm:items-center sm:justify-between md:p-6"
                >
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-sol-text">{group.label}</h3>
                    <p className="text-sol-muted text-sm font-medium">
                      {t("lessonCount", { count: group.lessons.length })}
                    </p>
                  </div>
                  <ChevronRight
                    size={22}
                    className={`text-sol-accent transition-transform ${expandedGrades[getGradeKey(subject.subject, group.grade)] ? "rotate-90" : ""}`}
                  />
                </button>

                {expandedGrades[getGradeKey(subject.subject, group.grade)] && (
                  <div className="">
                    <div className="flex justify-end">
                      <Link
                        href={`/student/learning/${group.grade}`}
                        prefetch={false}
                        className="flex items-center gap-2 text-sol-accent font-bold text-sm hover:underline hover:opacity-80 transition-all group/link"
                      >
                        {t("viewPath")} <ArrowUpRight size={16} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-10">
                      {group.lessons.map((lesson, idx) => {
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
                  </div>
                )}
              </div>
            ))}
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
      <CreateSubjectModal
        isOpen={metaModal === "subject"}
        onClose={() => setMetaModal(null)}
        onSuccess={handleCreateSuccess}
      />
      <CreateGradeModal
        isOpen={metaModal === "grade"}
        onClose={() => setMetaModal(null)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

function CreateSubjectModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations("Learning.metaModal");
  const [form, setForm] = useState({ title_en: "", title_vi: "", slug: "", color: "#268bd2" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      await lessonService.createSubject(form);
      onSuccess();
      onClose();
      setForm({ title_en: "", title_vi: "", slug: "", color: "#268bd2" });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("saveError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MetaModal title={t("subjectTitle")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MetaField label={t("titleEn")} value={form.title_en} onChange={(value) => setForm({ ...form, title_en: value })} required />
        <MetaField label={t("titleVi")} value={form.title_vi} onChange={(value) => setForm({ ...form, title_vi: value })} required />
        <MetaField label={t("slug")} value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
        <MetaField label={t("color")} type="color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
        {errorMessage && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">{errorMessage}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg">
          {loading ? t("saving") : t("createSubject")}
        </button>
      </form>
    </MetaModal>
  );
}

function CreateGradeModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations("Learning.metaModal");
  const locale = useLocale();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({ title_en: "", title_vi: "", slug: "", subject_id: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    lessonService.getSubjects().then((items) => {
      setSubjects(items);
      setForm((current) => ({ ...current, subject_id: current.subject_id || items[0]?.id || 0 }));
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      await lessonService.createGrade(form);
      onSuccess();
      onClose();
      setForm({ title_en: "", title_vi: "", slug: "", subject_id: subjects[0]?.id || 0 });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("saveError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MetaModal title={t("gradeTitle")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MetaField label={t("titleEn")} value={form.title_en} onChange={(value) => setForm({ ...form, title_en: value })} required />
        <MetaField label={t("titleVi")} value={form.title_vi} onChange={(value) => setForm({ ...form, title_vi: value })} required />
        <MetaField label={t("slug")} value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">{t("subject")}</span>
          <select
            required
            value={form.subject_id}
            onChange={(event) => setForm({ ...form, subject_id: Number(event.target.value) })}
            className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none focus:border-sol-accent"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {locale === "vi" ? subject.title_vi : subject.title_en}
              </option>
            ))}
          </select>
        </label>
        {errorMessage && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">{errorMessage}</p>}
        <button disabled={loading || subjects.length === 0} className="w-full rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg disabled:opacity-50">
          {loading ? t("saving") : t("createGrade")}
        </button>
      </form>
    </MetaModal>
  );
}

function MetaModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sol-bg/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-sol-border/20 bg-sol-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-sol-text">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-sol-muted hover:bg-sol-bg hover:text-sol-text">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetaField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none focus:border-sol-accent"
      />
    </label>
  );
}
