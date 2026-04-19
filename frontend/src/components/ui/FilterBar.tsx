import type { ReactNode } from "react";

export interface FilterBarProps {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}

export default function FilterBar({
  children,
  className = "",
  gridClassName = "grid grid-cols-1 gap-4 md:grid-cols-4"
}: FilterBarProps) {
  return (
    <section className={`rounded-[1.5rem] border border-sol-border/10 bg-sol-surface/20 p-4 md:rounded-[2rem] md:p-6 ${className}`}>
      <div className={gridClassName}>
        {children}
      </div>
    </section>
  );
}
