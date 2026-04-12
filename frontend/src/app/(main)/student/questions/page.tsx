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

  const visibleTemplates = [...templates]
    .filter((template) => {
      if (templateTypeFilter !== "all" && template.template_type !== templateTypeFilter) {
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
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">

      {/* Header */}
      <header className="relative p-10 md:p-16 rounded-[3rem] bg-sol-surface/30 border border-sol-border/10 overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <Database size={160} className="text-sol-accent" />
        </div>

        <div className="relative z-10 max-w-4xl flex justify-between items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-xs font-bold uppercase tracking-widest mb-6">
              <Code2 size={14} />
              <span>{t("adminToolbox")}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-sol-text tracking-tight mb-6 leading-tight">
              {t("title")}
            </h1>
            <p className="text-lg md:text-xl text-sol-muted leading-relaxed">
              {t("subtitle")}
            </p>
          </div>
          <Can I="manage" a="lesson">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-sol-accent text-sol-bg rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-sol-accent/20 cursor-pointer"
            >
              <PlusCircle size={20} />
              <span>{t("newTemplate")}</span>
            </button>
          </Can>
        </div>
      </header>

      <section className="rounded-[2rem] border border-sol-border/10 bg-sol-surface/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-3">
            <label className="text-xs font-black uppercase tracking-widest text-sol-muted">
              {t("filters.search")}
            </label>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-sol-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl pl-14 pr-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
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
              className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
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
              className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
            >
              <option value="all">{t("filters.allLessons")}</option>
              {lessonOptions.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
