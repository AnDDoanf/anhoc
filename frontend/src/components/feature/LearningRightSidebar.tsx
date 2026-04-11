import React from "react";

interface LearningRightSidebarProps {
  children: React.ReactNode;
}

export default function LearningRightSidebar({ children }: LearningRightSidebarProps) {
  return (
    <aside className="hidden xl:block w-72 flex-shrink-0">
      <div className="sticky top-24 p-6 rounded-2xl border border-sol-border/20 bg-sol-surface/50 backdrop-blur-md shadow-sm">
        {children}

        {/* Decorative elements for premium feel */}
        <div className="mt-8 pt-6 border-t border-sol-border/10">
          <div className="p-4 rounded-xl bg-sol-accent/5 border border-sol-accent/10">
            <h4 className="text-xs font-bold text-sol-accent mb-1 uppercase tracking-wider">Pro Tip</h4>
            <p className="text-[11px] text-sol-muted leading-relaxed">
              Use the Table of Contents to quickly jump between concepts. Your progress is saved automatically.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
