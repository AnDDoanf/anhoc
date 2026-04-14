"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Database, PlusCircle, Loader2, Code2, Search } from "lucide-react";
import CreateTemplateModal from "@/components/feature/CreateTemplateModal";
import PreviewTemplateModal from "@/components/feature/PreviewTemplateModal";
import TemplateCard from "@/components/feature/TemplateCard";
import { testService } from "@/services/testService";
import Can from "@/components/auth/Can";

export default function QuestionsAdminPage() {
  const t = useTranslations("Questions");
  const locale = useLocale();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [templateTypeFilter, setTemplateTypeFilter] = useState("all");
  const [lessonIdFilter, setLessonIdFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTemplates = async () => {
    try {
      const data = await testService.listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (id: string) => {
    setEditTemplateId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      try {
        await testService.removeTemplate(id);
        fetchTemplates();
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

  const templateTypeOptions = Array.from(
    new Set(
      templates
        .map((template) => template.template_type)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const lessonOptions = Array.from(
    new Map(
      templates
        .filter((template) => template.lesson_id || template.lesson?.id)
        .map((template) => {
          const lessonId = template.lesson_id || template.lesson?.id;
          const lessonTitle = template.lesson
            ? (locale === "vi" ? template.lesson.title_vi : template.lesson.title_en)
            : lessonId;

          return [
            lessonId,
            {
              id: lessonId,
              title: lessonTitle || lessonId,
            },
          ];
        })
    ).values()
  ).sort((a, b) => a.title.localeCompare(b.title));

  const difficultyOptions = ["easy", "medium", "hard"];

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

      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!normalizedQuery) {
        return true;
      }

      const lessonTitle = template.lesson
        ? (locale === "vi" ? template.lesson.title_vi : template.lesson.title_en)
        : "";
      const searchHaystack = [
        template.template_type,
        template.difficulty,
        template.lesson_id,
        template.body_template_en,
        template.body_template_vi,
        lessonTitle,
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
    <div className="mx-auto max-w-7xl space-y-8 py-4 md:space-y-16 md:py-10">

      {/* Header */}
      <header className="group relative overflow-hidden rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-5 sm:p-6 md:rounded-[3rem] md:p-16">
        <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform duration-1000 group-hover:scale-110 sm:p-6 md:p-10">
          <Database size={112} className="text-sol-accent md:h-40 md:w-40" />
        </div>

        <div className="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between">
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
          <Can I="manage" a="lesson">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3"
            >
              <PlusCircle size={18} className="md:h-5 md:w-5" />
              <span>{t("newTemplate")}</span>
            </button>
          </Can>
        </div>
      </header>

      <section className="rounded-[1.5rem] border border-sol-border/10 bg-sol-surface/20 p-4 md:rounded-[2rem] md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
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
              {t("filters.lesson")}
            </label>
            <select
              value={lessonIdFilter}
              onChange={(e) => setLessonIdFilter(e.target.value)}
              className="w-full rounded-2xl border border-sol-border/20 bg-sol-bg px-4 py-3 text-sm font-medium text-sol-text transition-all focus:ring-2 focus:ring-sol-accent/30 md:px-6 md:py-4 md:text-base"
            >
              <option value="all">{t("filters.allLessons")}</option>
              {lessonOptions.map((lesson) => (
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
        </div>
      </section>

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

      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={fetchTemplates}
        editTemplateId={editTemplateId}
      />

      <PreviewTemplateModal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />
    </div>
  );
}
