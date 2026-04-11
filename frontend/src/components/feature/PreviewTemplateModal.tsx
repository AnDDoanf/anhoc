"use client";

import React from "react";
import { X, PlayCircle } from "lucide-react";
import QuestionPlayer from "@/components/feature/QuestionPlayer";

interface PreviewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
}

export default function PreviewTemplateModal({ isOpen, onClose, template }: PreviewTemplateModalProps) {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sol-bg/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#fcfbf7] dark:bg-sol-surface border border-sol-border/20 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-6 border-b border-sol-border/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-2xl">
              <PlayCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-sol-text">Template Live Preview</h2>
              <p className="text-xs text-sol-muted font-medium uppercase tracking-widest">Interactive Simulator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sol-accent/10 text-sol-muted hover:text-sol-accent rounded-full transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <QuestionPlayer template={template} />
        </div>
      </div>
    </div>
  );
}
