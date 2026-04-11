// src/components/feature/LearningCard.tsx
"use client";

import {
  Book,
  Bookmark,
  ChevronRight,
  Clock,
  Layers,
  Pencil,
  Trash2
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Can from "@/components/auth/Can";

interface LearningCardProps {
  lessonId: string;
  gradeId: string;
  title: string;
  index: number;
  mastery?: {
    mastery_score: number | string;
    completion_status: string;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function LearningCard({ lessonId, gradeId, title, index, mastery, onEdit, onDelete }: LearningCardProps) {
  const t = useTranslations("Learning");
  const commonT = useTranslations("Common");
  const pathT = useTranslations("Path");

  return (
    <Link
      prefetch={false}
      href={`/student/learning/${gradeId}/${lessonId}`}
      className="group relative block bg-sol-surface/30 rounded-[2rem] p-8 border border-sol-border/5 hover:border-sol-accent/30 shadow-sm hover:shadow-2xl hover:bg-sol-surface/50 transition-all duration-500 overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Book size={100} className="text-sol-accent -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Index & Category */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sol-accent/10 border border-sol-accent/20 flex items-center justify-center text-sol-accent font-black">
              {index}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sol-muted">
              {t("section", { n: index })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Can I="manage" a="lesson">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (onEdit) onEdit(lessonId);
                }}
                className="p-2 text-sol-muted hover:text-sol-accent hover:bg-sol-accent/10 rounded-xl transition-colors cursor-pointer"
                title="Edit Lesson"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (onDelete) onDelete(lessonId);
                }}
                className="p-2 text-sol-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                title="Delete Lesson"
              >
                <Trash2 size={18} />
              </button>
            </Can>
            <Bookmark size={18} className="text-sol-muted group-hover:text-sol-accent transition-colors ml-2" />
          </div>
        </div>

        {/* Title & Progress */}
        <div className="flex-grow space-y-4">
          <h3 className="text-2xl font-bold text-sol-text leading-tight group-hover:text-sol-accent transition-colors">
            {title}
          </h3>
          
          {mastery && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                 <span className={`${mastery.completion_status === 'completed' ? 'text-green-500' : 'text-sol-accent'}`}>
                   {mastery.completion_status.replace('_', ' ')}
                 </span>
                 <span className="text-sol-muted">{Number(mastery.mastery_score).toFixed(0)}% Mastery</span>
              </div>
              <div className="h-1.5 w-full bg-sol-bg/50 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${mastery.completion_status === 'completed' ? 'bg-green-500' : 'bg-sol-accent'}`}
                   style={{ width: `${mastery.mastery_score}%` }}
                 />
              </div>
            </div>
          )}
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-6 pt-6 border-t border-sol-border/5">
          <div className="flex items-center gap-2 text-xs text-sol-muted">
            <Layers size={14} className="text-sol-accent" />
            <span>{commonT("comprehensive")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-sol-muted">
            <Clock size={14} className="text-sol-accent" />
            <span>{pathT("estimatedTime", { min: 45 })}</span>
          </div>
        </div>

        {/* Continuous Learning Button (CTA) */}
        <div className="mt-8 flex items-center justify-between text-sol-accent font-bold text-sm">
          <span className="group-hover:translate-x-1 transition-transform">{t("viewLesson")}</span>
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500
            ${mastery?.completion_status === 'completed' 
              ? 'bg-green-500/10 border-green-500/20 text-green-500 group-hover:bg-green-500 group-hover:text-sol-bg' 
              : 'border-sol-accent/20 group-hover:bg-sol-accent group-hover:text-sol-bg'}
          `}>
             <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </Link>
  );
}
