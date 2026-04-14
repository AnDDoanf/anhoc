"use client";

import React, { useState, useEffect } from "react";
import { X, Eye, Code2, Save, Languages, Hash, Layers } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { lessonService, CreateLessonDTO } from "@/services/lessonService";
import { useTranslations } from "next-intl";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editLessonId?: string | null;
}

export default function CreateLessonModal({ isOpen, onClose, onSuccess, editLessonId }: Props) {
  const t = useTranslations("Learning.modal");
  const [tab, setTab] = useState<"en" | "vi">("vi");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<CreateLessonDTO>({
    title_en: "",
    title_vi: "",
    content_markdown_en: "",
    content_markdown_vi: "",
    grade_id: 1, 
    subject_id: 1,
    order_index: 10,
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [gList, sList] = await Promise.all([
            lessonService.getGrades(),
            lessonService.getSubjects()
          ]);
          setGrades(gList);
          setSubjects(sList);
          
          if (editLessonId) {
            const currentLesson = await lessonService.getById(editLessonId);
            setFormData({
              title_en: currentLesson.title_en,
              title_vi: currentLesson.title_vi,
              content_markdown_en: currentLesson.content_markdown_en,
              content_markdown_vi: currentLesson.content_markdown_vi,
              grade_id: currentLesson.grade_id,
              subject_id: currentLesson.subject_id,
              order_index: currentLesson.order_index,
            });
          } else {
            setFormData({
              title_en: "",
              title_vi: "",
              content_markdown_en: "",
              content_markdown_vi: "",
              grade_id: gList.length > 0 ? gList[0].id : 1,
              subject_id: sList.length > 0 ? sList[0].id : 1,
              order_index: 10,
            });
          }
        } catch (err) {
          console.error("Failed to fetch meta data or lesson data:", err);
        }
      };
      fetchData();
    }
  }, [isOpen, editLessonId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editLessonId) {
        await lessonService.update(editLessonId, formData);
      } else {
        await lessonService.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save lesson:", err);
      alert(t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  const currentContent = tab === "vi" ? formData.content_markdown_vi : formData.content_markdown_en;
  const currentTitle = tab === "vi" ? formData.title_vi : formData.title_en;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-sol-bg/80 backdrop-blur-xl" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-sol-surface border border-sol-border/20 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <header className="p-6 border-b border-sol-border/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-2xl">
              <Code2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-sol-text">{editLessonId ? t("editTitle") : t("createTitle")}</h2>
              <p className="text-xs text-sol-muted font-medium uppercase tracking-widest">{t("adminTool")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setPreview(!preview)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${preview ? 'bg-sol-accent text-sol-bg' : 'bg-sol-surface border border-sol-border/10 text-sol-text hover:bg-sol-accent/10'}`}
            >
              {preview ? <Code2 size={16} /> : <Eye size={16} />}
              {preview ? t("editMode") : t("previewMode")}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-sol-accent/10 text-sol-muted hover:text-sol-accent rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Main Form */}
          <div className={`flex-1 flex flex-col p-6 overflow-y-auto ${preview ? 'hidden lg:flex' : 'flex'}`}>
            <form id="lesson-form" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Language Selector and Title */}
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-sol-bg/50 rounded-xl w-fit border border-sol-border/5">
                  <button 
                    type="button"
                    onClick={() => setTab("vi")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "vi" ? 'bg-sol-surface text-sol-accent shadow-sm' : 'text-sol-muted hover:text-sol-text'}`}
                  >
                    Tiếng Việt
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTab("en")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "en" ? 'bg-sol-surface text-sol-accent shadow-sm' : 'text-sol-muted hover:text-sol-text'}`}
                  >
                    English
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-sol-muted pl-1">{t("lessonTitle", { lang: tab.toUpperCase() })}</label>
                  <input 
                    type="text"
                    required
                    value={tab === "vi" ? formData.title_vi : formData.title_en}
                    onChange={(e) => setFormData({ ...formData, [tab === "vi" ? "title_vi" : "title_en"]: e.target.value })}
                    placeholder={t("lessonTitlePlaceholder")}
                    className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text placeholder-sol-muted/40 focus:outline-none focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Meta Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-sol-muted pl-1 flex items-center gap-2">
                    <Layers size={14} /> {t("grade")}
                  </label>
                  <select 
                    value={formData.grade_id}
                    onChange={(e) => setFormData({ ...formData, grade_id: parseInt(e.target.value) })}
                    className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text appearance-none focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                  >
                    {grades.map(g => (
                      <option key={g.id} value={g.id}>{g.title_en || g.slug}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-sol-muted pl-1">{t("subject")}</label>
                  <select 
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                    className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text appearance-none focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.title_en || s.slug}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-sol-muted pl-1 flex items-center gap-2">
                    <Hash size={14} /> {t("orderIndex")}
                  </label>
                  <input 
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                    className="w-full bg-sol-bg border border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text focus:ring-2 focus:ring-sol-accent/30 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Markdown Editor */}
              <div className="space-y-2 flex-1 min-h-[400px] flex flex-col">
                <label className="text-xs font-black uppercase tracking-widest text-sol-muted pl-1">{t("lessonContent")}</label>
                <textarea 
                  value={tab === "vi" ? formData.content_markdown_vi : formData.content_markdown_en}
                  onChange={(e) => setFormData({ ...formData, [tab === "vi" ? "content_markdown_vi" : "content_markdown_en"]: e.target.value })}
                  placeholder={t("lessonContentPlaceholder")}
                  className="flex-1 w-full bg-sol-bg border border-sol-border/20 rounded-[2rem] p-8 text-sol-text font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-sol-accent/30 transition-all"
                />
              </div>
            </form>
          </div>

          {/* Live Preview */}
          <div className={`flex-1 flex flex-col border-l border-sol-border/5 bg-sol-bg/30 overflow-y-auto p-12 ${preview ? 'flex' : 'hidden lg:flex'}`}>
            <div className="prose prose-invert max-w-none prose-headings:text-sol-text prose-p:text-sol-text/80 prose-strong:text-sol-accent">
              <h1 className="text-4xl font-black mb-8">{currentTitle || t("untitledLesson")}</h1>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    if (match && match[1] === "tikz") {
                      return (
                        <div className="my-8 bg-sol-accent/5 p-8 rounded-3xl border border-sol-accent/20 flex flex-col items-center gap-4 group">
                          <Code2 className="text-sol-accent/30" />
                          <span className="text-[10px] font-bold text-sol-accent uppercase tracking-[0.2em]">{t("tikzDetected")}</span>
                          <pre className="text-xs text-sol-muted opacity-50 overflow-x-auto w-full">{String(children).replace(/\n$/, "")}</pre>
                        </div>
                      );
                    }
                    return <code className={className} {...props}>{children}</code>;
                  }
                }}
              >
                {currentContent || t("emptyContent")}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-sol-border/5 bg-sol-surface/50 backdrop-blur-md flex items-center justify-between">
          <p className="text-sm text-sol-muted italic">{t("footerNote")}</p>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 rounded-2xl font-bold text-sol-muted hover:text-sol-accent transition-colors"
            >
              {t("cancel")}
            </button>
            <button 
              form="lesson-form"
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-10 py-3 bg-sol-accent text-sol-bg rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-sol-accent/30 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? t("saving") : (editLessonId ? t("saveChanges") : t("createLesson"))}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
