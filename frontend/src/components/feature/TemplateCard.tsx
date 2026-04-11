import React from 'react';
import { Pencil, Trash2, PlayCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface TemplateCardProps {
  tmpl: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview?: (tmpl: any) => void;
}

export default function TemplateCard({ tmpl, onEdit, onDelete, onPreview }: TemplateCardProps) {
  const t = useTranslations("Questions");
  const locale = useLocale();

  const bodyText = locale === "vi" ? tmpl.body_template_vi : tmpl.body_template_en;
  const lessonTitle = tmpl.lesson
    ? (locale === "vi" ? tmpl.lesson.title_vi : tmpl.lesson.title_en)
    : "";

  return (
    <div className="bg-[#f5f2e6] dark:bg-sol-surface border border-[#e8e4d2] dark:border-sol-border/10 rounded-[2.5rem] p-8 md:p-10 relative group hover:border-sol-accent/40 transition-all flex flex-col justify-between hover:shadow-2xl hover:shadow-[#e8e4d2]/50 dark:hover:shadow-sol-accent/5 duration-500">

      {/* Absolute Icon Buttons */}
      <div className="absolute top-8 right-8 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
         {onPreview && (
           <button onClick={(e) => { e.stopPropagation(); onPreview(tmpl); }} className="text-sol-muted hover:text-green-500 transition-colors cursor-pointer" title="Preview Live Template">
             <PlayCircle size={20} strokeWidth={1.5} />
           </button>
         )}
         <button onClick={(e) => { e.stopPropagation(); onEdit(tmpl.id); }} className="text-sol-muted hover:text-sol-accent transition-colors cursor-pointer" title="Edit Template">
           <Pencil size={20} strokeWidth={1.5} />
         </button>
         <button onClick={(e) => { e.stopPropagation(); onDelete(tmpl.id); }} className="text-sol-muted hover:text-red-500 transition-colors cursor-pointer" title="Delete Template">
           <Trash2 size={20} strokeWidth={1.5} />
         </button>
      </div>

      <div className="flex-grow space-y-6 pt-2">
        {/* Primary body text in current locale */}
        <h3 className="text-[1rem] font-bold text-sol-accent/80 pr-16 leading-snug">
          {bodyText}
        </h3>

        {/* Secondary body in the other locale (dimmed) */}
        <p className="text-sol-muted text-sm italic leading-relaxed font-light">
          {locale === "vi" ? tmpl.body_template_en : tmpl.body_template_vi}
        </p>
      </div>

      {/* Bottom Metadata Block */}
      <div className="mt-12 space-y-4">
        <div className="flex justify-between items-center text-xs font-black tracking-widest text-sol-muted uppercase">
          <span>{t("type")}:</span>
          <span className="text-sol-accent">{tmpl.template_type}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-black tracking-widest text-sol-muted uppercase">
          <span>{t("ref")}:</span>
          <span className="text-sol-accent">{lessonTitle || t("global")}</span>
        </div>
      </div>

    </div>
  );
}
