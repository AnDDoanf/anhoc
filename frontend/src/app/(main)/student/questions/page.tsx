"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Database, PlusCircle, Loader2, Code2 } from "lucide-react";
import CreateTemplateModal from "@/components/feature/CreateTemplateModal";
import PreviewTemplateModal from "@/components/feature/PreviewTemplateModal";
import TemplateCard from "@/components/feature/TemplateCard";
import { testService } from "@/services/testService";
import Can from "@/components/auth/Can";

export default function QuestionsAdminPage() {
  const t = useTranslations("Questions");
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

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

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {templates.map(tmpl => (
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
