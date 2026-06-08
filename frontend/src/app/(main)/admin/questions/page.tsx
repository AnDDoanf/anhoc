"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Database, PlusCircle, Loader2, Code2, Search } from "lucide-react";
import CreateTemplateModal from "@/components/feature/CreateTemplateModal";
import PreviewTemplateModal from "@/components/feature/PreviewTemplateModal";
import TemplateCard from "@/components/feature/TemplateCard";
import { testService } from "@/services/testService";
import Can from "@/components/auth/Can";
import Hero from "@/components/ui/Hero";
import FilterBar from "@/components/ui/FilterBar";
import ProtectedRoute from "@/components/guard/ProtectedRoute";

export default function QuestionsAdminPage() {
  const t = useTranslations("Questions");
  const locale = useLocale();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [templateTypeFilter, setTemplateTypeFilter] = useState("all");
  const [gradeIdFilter, setGradeIdFilter] = useState("all");
  const [lessonIdFilter, setLessonIdFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMeta, setFilterMeta] = useState<{
    templateTypes: string[];
    grades: Array<{ id: string; slug: string; title_en: string; title_vi: string }>;
    lessons: Array<{ id: string; title_en: string; title_vi: string; grade_id: string }>;
    difficulties: string[];
  }>({
    templateTypes: [],
    grades: [],
    lessons: [],
    difficulties: ["easy", "medium", "hard"],
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTemplates = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await testService.listTemplates({
        page: nextPage,
        pageSize: 10,
        search: searchQuery || undefined,
        templateType: templateTypeFilter,
        gradeId: gradeIdFilter,
        lessonId: lessonIdFilter,
        difficulty: difficultyFilter,
      });
      setTemplates((current) => append ? [...current, ...data.items] : data.items);
      setHasMore(data.pagination.hasMore);
      setPage(data.pagination.page);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [difficultyFilter, gradeIdFilter, lessonIdFilter, searchQuery, templateTypeFilter]);

  useEffect(() => {
    const loadFilterMeta = async () => {
      try {
        const data = await testService.getTemplateFilters();
        setFilterMeta(data);
      } catch (error) {
        console.error("Failed to load template filters:", error);
      }
    };

    loadFilterMeta();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTemplates(1, false);
  }, [difficultyFilter, fetchTemplates, gradeIdFilter, lessonIdFilter, searchQuery, templateTypeFilter]);

  const handleEdit = (id: string) => {
    setEditTemplateId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      try {
        await testService.removeTemplate(id);
        fetchTemplates(1, false);
      } catch (error) {
        console.error("Failed to delete the template", error);
        alert(t("deleteError"));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditTemplateId(null), 300);
  };

  const templateTypeOptions = filterMeta.templateTypes;

  const lessonOptions = filterMeta.lessons
    .map((lesson) => ({
      id: lesson.id,
      title: locale === "vi" ? lesson.title_vi : lesson.title_en,
      gradeId: lesson.grade_id,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const visibleLessonOptions = lessonOptions.filter((lesson) => (
    gradeIdFilter === "all" || lesson.gradeId === gradeIdFilter
  ));

  useEffect(() => {
    if (lessonIdFilter === "all") return;
    const selectedLesson = lessonOptions.find((lesson) => lesson.id === lessonIdFilter);
    if (gradeIdFilter !== "all" && selectedLesson?.gradeId !== gradeIdFilter) {
      setLessonIdFilter("all");
    }
  }, [gradeIdFilter, lessonIdFilter, lessonOptions]);

  const gradeOptions = filterMeta.grades
    .map((grade) => ({
      id: String(grade.id),
      title: locale === "vi" ? grade.title_vi : grade.title_en,
      slug: grade.slug || "",
    }))
    .sort((a, b) => {
    const gradeNumberA = Number(a.slug.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
    const gradeNumberB = Number(b.slug.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
    if (gradeNumberA !== gradeNumberB) return gradeNumberA - gradeNumberB;
    return a.title.localeCompare(b.title, locale);
  });

  const difficultyOptions = filterMeta.difficulties;

  const visibleTemplates = [...templates]
    .filter((template) => {
      if (templateTypeFilter !== "all" && template.template_type !== templateTypeFilter) {
        return false;
      }

      if (difficultyFilter !== "all" && (template.difficulty || "medium") !== difficultyFilter) {
        return false;
      }

      const currentLessonId = template.lesson_id || template.lesson?.id || "";
      if (lessonIdFilter !== "all" && currentLessonId !== lessonIdFilter) {
        return false;
      }

      const currentGradeId = template.lesson?.grade?.id ? String(template.lesson.grade.id) : "";
      if (gradeIdFilter !== "all" && currentGradeId !== gradeIdFilter) {
        return false;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!normalizedQuery) {
        return true;
      }

      const lessonTitle = template.lesson
        ? (locale === "vi" ? template.lesson.title_vi : template.lesson.title_en)
        : "";
      const gradeTitle = template.lesson?.grade
        ? (locale === "vi" ? template.lesson.grade.title_vi : template.lesson.grade.title_en)
        : "";
      const searchHaystack = [
        template.template_type,
        template.difficulty,
        template.lesson_id,
        template.body_template_en,
        template.body_template_vi,
        lessonTitle,
        gradeTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchHaystack.includes(normalizedQuery)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const templateTypeCompare = (a.template_type || "").localeCompare(b.template_type || "");
      if (templateTypeCompare !== 0) {
        return templateTypeCompare;
      }

      const lessonA = a.lesson_id || a.lesson?.id || "";
      const lessonB = b.lesson_id || b.lesson?.id || "";
      const lessonCompare = lessonA.localeCompare(lessonB);
      if (lessonCompare !== 0) {
        return lessonCompare;
      }

      return (a.id || "").localeCompare(b.id || "");
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={["admin", "supervisor", "teacher"]}>
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <Hero
        icon={<Database size={112} className="text-sol-accent md:h-40 md:w-40" />}
        className="md:rounded-[3rem]"
        containerClassName="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between"
      >
        <div className="space-y-3 md:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
            <Code2 size={11} className="md:h-3.5 md:w-3.5" />
            <span>{t("adminToolbox")}</span>
          </div>
          <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
            {t("subtitle")}
          </p>
        </div>
        <Can I="manage" a="test">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3"
          >
            <PlusCircle size={18} className="md:h-5 md:w-5" />
            <span>{t("newTemplate")}</span>
          </button>
        </Can>
      </Hero>

      <FilterBar gridClassName="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="space-y-2 md:col-span-4">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("filters.search")}
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted md:left-5 md:h-[18px] md:w-[18px]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg py-3 pl-11 pr-4 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:pl-14 md:text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("filters.templateType")}
          </label>
          <select
            value={templateTypeFilter}
            onChange={(e) => setTemplateTypeFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:text-base"
          >
            <option value="all">{t("filters.allTemplateTypes")}</option>
            {templateTypeOptions.map((templateType) => (
              <option key={templateType} value={templateType}>
                {templateType}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("filters.grade")}
          </label>
          <select
            value={gradeIdFilter}
            onChange={(e) => setGradeIdFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:text-base"
          >
            <option value="all">{t("filters.allGrades")}</option>
            {gradeOptions.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("filters.lesson")}
          </label>
          <select
            value={lessonIdFilter}
            onChange={(e) => setLessonIdFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:text-base"
          >
            <option value="all">{t("filters.allLessons")}</option>
            {visibleLessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("filters.difficulty")}
          </label>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:text-base"
          >
            <option value="all">{t("filters.allDifficulties")}</option>
            {difficultyOptions.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {t(`modal.difficultyOptions.${difficulty}`)}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
        {visibleTemplates.map(tmpl => (
          <TemplateCard
            key={tmpl.id}
            tmpl={tmpl}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPreview={(t) => setPreviewTemplate(t)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchTemplates(page + 1, true)}
            disabled={loadingMore}
            className="rounded-2xl border border-sol-border/20 bg-sol-surface px-6 py-3 text-sm font-black text-sol-text transition hover:border-sol-accent/40 hover:text-sol-accent disabled:opacity-60"
          >
            {loadingMore ? t("loadingMore") : t("showMore")}
          </button>
        </div>
      )}

      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => fetchTemplates(1, false)}
        editTemplateId={editTemplateId}
      />

      <PreviewTemplateModal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />
      </div>
    </ProtectedRoute>
  );
}
