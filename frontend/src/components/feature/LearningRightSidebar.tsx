// src/components/feature/LearningRightSidebar.tsx
import React from "react";
import { useTranslations } from "next-intl";
interface LearningRightSidebarProps {
  children: React.ReactNode;
}

export default function LearningRightSidebar({ children }: LearningRightSidebarProps) {
  const t = useTranslations("Learning");
  return (
    <aside className="hidden w-80 flex-shrink-0 xl:block relative">
      <div className="sticky top-24 flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[2.5rem] border border-sol-border/10 bg-sol-surface/30 p-8 shadow-2xl backdrop-blur-xl hover:bg-sol-surface/40 transition-all duration-500">
        <div className="scrollbar-theme flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {children}
        </div>
      </div>
    </aside>
  );
}
