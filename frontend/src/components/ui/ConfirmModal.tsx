"use client";

import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmModalProps) {
  const t = useTranslations("Common");
  
  if (!isOpen) return null;

  const displayConfirm = confirmText || t("confirm");
  const displayCancel = cancelText || t("cancel");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-sol-surface border border-sol-border/20 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-sol-border/5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-sol-accent/10 text-sol-accent'}`}>
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-sol-text tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-sol-muted hover:text-sol-text hover:bg-sol-border/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 py-8">
          <p className="text-sol-muted text-base leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 bg-sol-bg/50 border-t border-sol-border/5 flex items-center justify-end gap-3 rounded-b-[2rem]">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl font-bold text-sol-muted hover:text-sol-text hover:bg-sol-border/10 transition-colors"
          >
            {displayCancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isDestructive
                ? 'bg-red-500 text-white hover:bg-red-500/90 hover:shadow-red-500/20'
                : 'bg-sol-accent text-sol-bg hover:bg-sol-accent/90 hover:shadow-sol-accent/20'
              }`}
          >
            {displayConfirm}
          </button>
        </div>
      </div>

      {/* Click outside to close (background overlay is actually clickable implicitly via another wrapper if wanted, but standard keeps it simple) */}
      <div className="absolute inset-0 z-[-1]" onClick={onCancel} />
    </div>
  );
}
