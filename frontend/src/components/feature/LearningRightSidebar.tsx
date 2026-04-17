// src/components/feature/LearningRightSidebar.tsx
import React from "react";
import { useTranslations } from "next-intl";
interface LearningRightSidebarProps {
  children: React.ReactNode;
}

export default function LearningRightSidebar({ children }: LearningRightSidebarProps) {
  const t = useTranslations("Learning");
  return (
    <aside className="hidden w-72 flex-shrink-0 xl:block">
      <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-sol-border/20 bg-sol-surface/50 p-6 shadow-sm backdrop-blur-md">
        <div className="scrollbar-hide flex-1 overflow-y-auto pr-1">
          {children}

          {/* Decorative elements for premium feel */}
          <div className="mt-8 border-t border-sol-border/10 pt-6">
            <div className="flex flex-col gap-2 rounded-xl border border-sol-accent/10 bg-sol-accent/5 p-4">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-sol-accent">{t("proTip")}</h4>
              <p className="text-[11px] leading-relaxed text-sol-muted">
                {t("proTipDescription1")}
              </p>
              <p className="text-[11px] leading-relaxed text-sol-muted">
                {t("proTipDescription2")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
